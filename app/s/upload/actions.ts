"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ingestUpload } from "@/lib/data/ingest";
import { logActivity } from "@/lib/activity";

export type UploadState = { error?: string };

const MAX_FILES = 5;
const MAX_BYTES = 15 * 1024 * 1024;

export async function uploadSourceAction(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const title = String(formData.get("title") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

  if (!title) return { error: "أدخل اسمًا للمسار." };
  if (!subject) return { error: "اختر المادة." };
  if (files.length === 0) return { error: "اختر ملفًا واحدًا على الأقل." };
  if (files.length > MAX_FILES) return { error: `الحد الأقصى ${MAX_FILES} ملفات في المرة الواحدة.` };
  for (const f of files) {
    if (f.size > MAX_BYTES) return { error: `الملف "${f.name}" أكبر من الحد المسموح (١٥ ميجابايت).` };
  }

  const parts = await Promise.all(
    files.map(async (f) => ({
      name: f.name,
      mimeType: f.type || "text/plain",
      base64: Buffer.from(await f.arrayBuffer()).toString("base64"),
    })),
  );

  let fileId: string;
  let usedFallback = false;
  try {
    const result = await ingestUpload(parts, title, subject);
    fileId = result.file.id;
    usedFallback = result.usedFallback;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "تعذّر معالجة الملفات. حاول مرة أخرى." };
  }

  // بذرة القاعدة الأولى: لولا هذا الصفّ لما عرفت المهمة المجدولة أن ملفًا رُفع
  // أصلًا — الملف نفسه يعيش في مخزن الذاكرة الذي لا تراه.
  await logActivity({ kind: "source_uploaded", fileRef: fileId, label: title });

  revalidatePath("/s", "layout");
  redirect(`/s/course/${fileId}${usedFallback ? "?fallback=1" : ""}`);
}
