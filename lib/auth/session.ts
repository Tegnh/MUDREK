import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/db";

export type UserRole = Database["public"]["Enums"]["user_role"];

export type Profile = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

/** وجهة كل دور بعد الدخول. مصدر واحد لهذه المعرفة في المشروع كله. */
export function homeFor(role: UserRole): "/t" | "/s" {
  return role === "teacher" ? "/t" : "/s";
}

export function normalizeRole(value: unknown): UserRole | null {
  return value === "teacher" || value === "student" ? value : null;
}

/**
 * الدور كما تحمله الجلسة نفسها.
 *
 * app_metadata يكتبها مشغّل sync_role_to_app_metadata في القاعدة (هجرة 003)،
 * ولا سبيل للعميل إلى تعديلها — بخلاف user_metadata. قراءتها من هنا توفّر
 * استعلامًا على كل طلب. تُعاد null لحساب أقدم من الهجرة، فيرجع النداء إلى
 * public.users كالمعتاد.
 */
export function roleFromClaims(user: User): UserRole | null {
  return normalizeRole(user.app_metadata?.role);
}

/**
 * يضمن وجود صفّ في public.users للمستخدم المُصادَق عليه.
 *
 * الحالة التي يعالجها: حساب في auth.users بلا ملف تعريف — يحدث إن أُنشئ من
 * لوحة Supabase مباشرة، أو إن فشل مشغّل handle_new_auth_user لحظة التسجيل.
 * بدون هذا الصفّ لا يعرف النظام دور المستخدم، فيدخل إلى لوحة فارغة أبدًا.
 * يُستخدم مفتاح service_role لأن سياسة الإدراج على users تتطلب صفًّا يخصّ
 * المستخدم نفسه، والاستدعاء هنا يجري نيابةً عنه.
 */
async function ensureProfile(user: User): Promise<Profile | null> {
  const email = user.email;
  if (!email) return null;

  const role =
    roleFromClaims(user) ?? normalizeRole(user.user_metadata?.role) ?? "student";
  const name =
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()) ||
    email.split("@")[0];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .upsert({ id: user.id, email, role, name }, { onConflict: "id", ignoreDuplicates: true })
    .select("id, email, name, role")
    .maybeSingle();

  if (error) return null;
  // ignoreDuplicates يُعيد صفرَ صفوف إن كان الصفّ موجودًا أصلًا — نقرأه حينها.
  if (data) return data;

  const { data: existing } = await admin
    .from("users")
    .select("id, email, name, role")
    .eq("id", user.id)
    .maybeSingle();

  return existing ?? null;
}

/**
 * المستخدم الحالي وملفّه، أو null للزائر.
 *
 * مغلّفة بـ cache(): التخطيط والصفحة داخله يطلبانها في نفس التمرير، وبدون
 * التغليف تتكرّر رحلتا الشبكة (getUser + قراءة users) لكل مستهلك.
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("id, email, name, role")
    .eq("id", user.id)
    .maybeSingle();

  return data ?? (await ensureProfile(user));
});

/** يفرض وجود جلسة، ويعيد الزائر إلى /login. */
export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
}

/** يفرض دورًا بعينه، ويحوّل من دخل نافذة غير نافذته إلى نافذته هو. */
export async function requireRole(role: UserRole): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== role) redirect(homeFor(profile.role));
  return profile;
}
