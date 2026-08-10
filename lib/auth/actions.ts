"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { homeFor, normalizeRole, type UserRole } from "@/lib/auth/session";

/* ==========================================================================
   إجراءات المصادقة

   للمنصة مدخلان متكافئان:
   ١) بريد + كلمة مرور — المسار الافتراضي، لا يعتمد على تسليم أي رسالة.
   ٢) رابط دخول لمرة واحدة (Magic Link) — يبقى متاحًا لمن يفضّله، لكنه لم
      يعد الطريق الوحيد بعد أن تعذّر إرسال البريد في هذه البيئة.
   ========================================================================== */

export type AuthState = {
  /** خطأ عام يظهر أعلى النموذج. */
  error?: string;
  /** أخطاء مرتبطة بحقل بعينه. */
  fieldErrors?: Partial<Record<"name" | "email" | "password" | "confirm", string>>;
  /** بريد أُرسل إليه رابط دخول — يبدّل النموذج إلى حالة "تفقّد بريدك". */
  sentTo?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD = 8;

function readEmail(formData: FormData): string {
  return String(formData.get("email") ?? "").trim().toLowerCase();
}

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** هل للبريد حساب قائم؟ يُستعمل للرسائل الموجّهة لا للتحقق الأمني. */
async function emailIsRegistered(email: string): Promise<boolean | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (error) return null;
    return Boolean(data);
  } catch {
    return null;
  }
}

/** الدور المخزَّن للمستخدم، ومرجعه public.users دائمًا لا الرابط. */
async function storedRole(userId: string): Promise<UserRole> {
  const supabase = await createClient();
  const { data } = await supabase.from("users").select("role").eq("id", userId).maybeSingle();
  return data?.role ?? "student";
}

/* --------------------------------------------------------------------------
   ١) الدخول بكلمة مرور
   -------------------------------------------------------------------------- */

export async function signInAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = readEmail(formData);
  const password = String(formData.get("password") ?? "");

  const fieldErrors: AuthState["fieldErrors"] = {};
  if (!EMAIL_RE.test(email)) fieldErrors.email = "أدخل بريدًا إلكترونيًا صحيحًا.";
  if (!password) fieldErrors.password = "أدخل كلمة المرور.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const supabase = await createClient();
  let { data, error } = await supabase.auth.signInWithPassword({ email, password });

  // البريد غير مؤكَّد: التأكيد في هذا النشر لا يمرّ عبر رسالة أصلًا (انظر
  // signUpAction)، فبقاء الحساب معلّقًا خلف رسالة لم تصل يحبس صاحبه خارجه.
  // يُؤكَّد هنا بمفتاح الخدمة ثم تُعاد المحاولة مرة واحدة.
  if (error?.code === "email_not_confirmed") {
    try {
      const admin = createAdminClient();
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const found = list?.users.find((u) => u.email?.toLowerCase() === email);
      if (found) {
        await admin.auth.admin.updateUserById(found.id, { email_confirm: true });
        ({ data, error } = await supabase.auth.signInWithPassword({ email, password }));
      }
    } catch {
      // يسقط إلى رسالة الخطأ العامة أدناه.
    }
  }

  if (error || !data?.user) {
    const registered = await emailIsRegistered(email);
    if (registered === false) {
      return { error: "لا يوجد حساب بهذا البريد. أنشئ حسابًا جديدًا أوّلًا." };
    }
    return {
      error:
        "كلمة المرور غير صحيحة. إن كنت قد دخلت سابقًا برابط الدخول فحسابك بلا " +
        "كلمة مرور بعد — استخدم خيار «رابط الدخول» أدناه.",
    };
  }

  const role = await storedRole(data.user.id);
  revalidatePath("/", "layout");
  redirect(homeFor(role));
}

/* --------------------------------------------------------------------------
   ٢) إنشاء حساب جديد

   يُنشأ الحساب بمفتاح الخدمة مع email_confirm: true، ثم يُسجَّل دخوله فورًا.
   السبب: تسليم البريد غير موثوق هنا، وربط أوّل دخول برسالة قد لا تصل يعني
   حسابًا لا يُفتح أبدًا.

   المقابل الذي يجب أن يكون معلومًا: لا تحقّق فعليًا من ملكية البريد. لذلك
   يمنع هذا الإجراء صراحةً تعيين كلمة مرور لبريد *مسجَّل من قبل* — وإلا
   لأصبح إنشاء الحساب طريقًا للاستيلاء على حساب قائم ببياناته. الترقية إلى
   تحقّق حقيقي = تعطيل email_confirm هنا بعد ضبط مزوّد SMTP في Supabase.
   -------------------------------------------------------------------------- */

export async function signUpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = readEmail(formData);
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const role = normalizeRole(formData.get("role")) ?? "student";

  const fieldErrors: AuthState["fieldErrors"] = {};
  if (name.length < 2) fieldErrors.name = "أدخل اسمك كما تريده أن يظهر.";
  if (!EMAIL_RE.test(email)) fieldErrors.email = "أدخل بريدًا إلكترونيًا صحيحًا.";
  if (password.length < MIN_PASSWORD)
    fieldErrors.password = `كلمة المرور ${MIN_PASSWORD} أحرف على الأقل.`;
  if (confirm !== password) fieldErrors.confirm = "الكلمتان غير متطابقتين.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  if (await emailIsRegistered(email)) {
    return { error: "هذا البريد مسجَّل بالفعل. سجّل الدخول بدل إنشاء حساب جديد." };
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "إعداد الخادم ناقص. تعذّر إنشاء الحساب الآن." };
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role },
    // نسخة الدور التي يقرأها middleware من التوكن بلا استعلام (هجرة 003).
    app_metadata: { role },
  });

  if (createError || !created?.user) {
    const message = createError?.message ?? "";
    if (/already|registered|exists/i.test(message)) {
      return { error: "هذا البريد مسجَّل بالفعل. سجّل الدخول بدل إنشاء حساب جديد." };
    }
    if (/password/i.test(message)) {
      return { fieldErrors: { password: "كلمة المرور ضعيفة. اختر كلمة أطول." } };
    }
    return { error: "تعذّر إنشاء الحساب. حاول مرة أخرى." };
  }

  // شبكة أمان: إن لم يعمل مشغّل handle_new_auth_user لأي سبب، يبقى المستخدم
  // بلا ملف تعريف — ومعه بلا دور ولا لوحة.
  await admin
    .from("users")
    .upsert(
      { id: created.user.id, email, role, name },
      { onConflict: "id", ignoreDuplicates: true },
    );

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    return { error: "أُنشئ الحساب، لكن تعذّر الدخول تلقائيًا. سجّل الدخول يدويًا." };
  }

  revalidatePath("/", "layout");
  redirect(homeFor(role));
}

/* --------------------------------------------------------------------------
   ٣) رابط الدخول لمرة واحدة — المسار البديل

   الدور القادم من الرابط (?role=) لا يُصدَّق إلا لبريد لم يُسجَّل من قبل.
   لبريد موجود يُهمَل تمامًا ويبقى users.role المخزَّن هو المرجع — وإلا لأمكن
   لطالب أن يترقّى إلى معلّم بتحرير شريط العنوان. القاعدة نفسها محصَّنة
   بمشغّلَي handle_new_auth_user وprevent_role_change.
   -------------------------------------------------------------------------- */

export async function sendMagicLinkAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = readEmail(formData);
  if (!EMAIL_RE.test(email)) {
    return { fieldErrors: { email: "أدخل بريدًا إلكترونيًا صحيحًا." } };
  }

  const requestedRole = normalizeRole(formData.get("role"));
  // تعذّر الفحص (null): يُعامَل البريد كأنه موجود، فلا يُمرَّر أي دور.
  const registered = await emailIsRegistered(email);
  const role = registered === false ? requestedRole : null;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      data: role ? { role } : undefined,
      emailRedirectTo: `${await origin()}/auth/callback`,
    },
  });

  if (error) {
    return {
      error:
        "تعذّر إرسال رابط الدخول — خدمة البريد لا تستجيب. استخدم الدخول " +
        "بكلمة المرور بدلًا منه.",
    };
  }

  return { sentTo: email };
}

/* --------------------------------------------------------------------------
   ٤) الخروج
   -------------------------------------------------------------------------- */

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
