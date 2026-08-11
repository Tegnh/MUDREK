"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth/session";
import { ingestUpload, type UploadFilePart } from "@/lib/data/ingest";
import { logActivity } from "@/lib/activity";
import {
  BUCKET,
  MAX_BYTES,
  MAX_FILES,
  resolveMimeType,
  SUPPORTED_MIME_TYPES,
  type RequestedFile,
  type TicketsResult,
  type UploadedRef,
  type UploadState,
  type UploadTicket,
} from "./limits";

/**
 * مسار الرفع في خطوتين.
 *
 * لماذا لا يمرّ الملف بالخادم: الـ Server Action محكوم بسقف Next (١ ميجابايت
 * افتراضيًا) وفوقه سقف منصة Vercel لجسم أي طلب (٤٫٥ ميجابايت، لا يُرفَع
 * بإعداد). كان الأول هو مصدر خطأ «Body exceeded 1 MB limit»، ورفعُه وحده
 * كان سيبدّله بالثاني. فصار المتصفح يرفع الملف مباشرة إلى Supabase Storage
 * برابط موقّع، ولا يعبر الخادمَ إلا مساره — فلا يبقى سقف بينهما أصلًا.
 */

/* ─────────────────────────── ١) إصدار روابط الرفع ─────────────────────────── */

/**
 * يُصدر رابطًا موقّعًا لكل ملف. المسار يبنيه الخادم لا العميل — فلا يستطيع
 * متصفّح أن يكتب في مجلَّد طالب آخر ولو زوّر الطلب.
 */
export async function createUploadTicketsAction(
  files: RequestedFile[],
): Promise<TicketsResult> {
  const profile = await requireProfile();

  if (files.length === 0) return { ok: false, error: "اختر ملفًا واحدًا على الأقل." };
  if (files.length > MAX_FILES) {
    return { ok: false, error: `الحد الأقصى ${MAX_FILES} ملفات في المرة الواحدة.` };
  }

  for (const f of files) {
    if (f.size <= 0) return { ok: false, error: `الملف "${f.name}" فارغ.` };
    if (f.size > MAX_BYTES) {
      return { ok: false, error: `الملف "${f.name}" أكبر من الحد المسموح (٢٥ ميجابايت).` };
    }
    if (!SUPPORTED_MIME_TYPES.has(resolveMimeType(f.name, f.type))) {
      return { ok: false, error: `نوع الملف "${f.name}" غير مدعوم. المسموح: PDF · TXT · MD · PPTX.` };
    }
  }

  const admin = createAdminClient();
  const tickets: UploadTicket[] = [];

  for (const f of files) {
    const safeName = f.name.replace(/[^\p{L}\p{N}._-]+/gu, "_").slice(-80);
    const path = `${profile.id}/${randomUUID()}-${safeName}`;
    const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) {
      return { ok: false, error: error?.message ?? "تعذّر تجهيز الرفع. حاول مرة أخرى." };
    }
    tickets.push({ path: data.path, signedUrl: data.signedUrl, token: data.token, name: f.name });
  }

  return { ok: true, tickets };
}

/* ─────────────────────────── ٢) المعالجة بعد الرفع ─────────────────────────── */

/**
 * يقرأ الملفات من المخزن ويبني منها المسار، ثم يحذفها.
 *
 * الحذف في finally مقصود: هذه نُسخ مؤقّتة لا أرشيف — المحتوى المفيد بعد
 * التقسيم هو الأقسام لا ملفّ المصدر، وتركُها يراكم تخزينًا لا يقرؤه أحد.
 */
export async function ingestUploadedAction(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const profile = await requireProfile();

  const title = String(formData.get("title") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();

  let refs: UploadedRef[];
  try {
    refs = JSON.parse(String(formData.get("uploaded") ?? "[]")) as UploadedRef[];
  } catch {
    return { error: "تعذّر قراءة بيانات الملفات المرفوعة." };
  }

  if (!title) return { error: "أدخل اسمًا للمسار." };
  if (!subject) return { error: "اختر المادة." };
  if (!Array.isArray(refs) || refs.length === 0) return { error: "اختر ملفًا واحدًا على الأقل." };
  if (refs.length > MAX_FILES) {
    return { error: `الحد الأقصى ${MAX_FILES} ملفات في المرة الواحدة.` };
  }
  // لا يكفي أن الخادم بنى المسار عند الإصدار: هذا نداء منفصل، ولا شيء يمنع
  // عميلًا من إرسال مسار طالب آخر هنا لولا هذا الفحص.
  if (refs.some((r) => typeof r?.path !== "string" || !r.path.startsWith(`${profile.id}/`))) {
    return { error: "مسار ملف غير صالح." };
  }

  const admin = createAdminClient();
  const paths = refs.map((r) => r.path);
  // redirect يعمل برمي استثناء خاص، فلا يجوز أن يقع داخل try الذي يبتلع
  // الأخطاء — لذلك تُخزَّن الوجهة هنا وتُنفَّذ بعد الكتلة.
  let destination: string;

  try {
    const parts: UploadFilePart[] = await Promise.all(
      refs.map(async (ref) => {
        const { data, error } = await admin.storage.from(BUCKET).download(ref.path);
        if (error || !data) {
          throw new Error(`تعذّر قراءة الملف "${ref.name}" من المخزن.`);
        }
        return {
          name: ref.name,
          mimeType: resolveMimeType(ref.name, ref.type || data.type),
          bytes: Buffer.from(await data.arrayBuffer()),
        };
      }),
    );

    const { file, usedFallback } = await ingestUpload(parts, title, subject);

    await logActivity({ kind: "source_uploaded", fileRef: file.id, label: title });
    revalidatePath("/s", "layout");

    destination = `/s/course/${file.id}${usedFallback ? "?fallback=1" : ""}`;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "تعذّر معالجة الملفات. حاول مرة أخرى." };
  } finally {
    await admin.storage.from(BUCKET).remove(paths);
  }

  redirect(destination);
}
