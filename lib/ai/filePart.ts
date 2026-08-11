/**
 * بناء جزء المحتوى (Part) الذي يُمرَّر إلى Gemini لملفٍ مرفوع.
 *
 * لماذا مساران لا مسار واحد: التمرير المضمَّن (inlineData) يرمّز الملف بـ
 * Base64 داخل جسم الطلب نفسه، وسقف الطلب الواحد في واجهة Gemini ~٢٠
 * ميجابايت. وترميز Base64 يُضخّم الحجم بمقدار الثلث تقريبًا، فملف ١٥
 * ميجابايت يصير ~٢٠ قبل احتساب البرومبت — أي أن السقف العملي للتضمين أقلّ
 * بكثير مما يبدو. الملفات فوق ذلك ترفَع عبر Files API ثم يُشار إليها بـ URI.
 *
 * ولمَ لا نُمرّر كل شيء عبر Files API إذن: هو رحلة شبكة إضافية كاملة (رفع ثم
 * انتظار انتهاء المعالجة)، وأكثر ملفات الطلاب صغيرة — فدفع تلك الكلفة على
 * كل ملف يُبطئ الحالة الشائعة إكرامًا للنادرة.
 */

import type { Part } from "@google/genai";
import { getGenAIClient } from "./client";

/**
 * حدّ التضمين. ١٢ ميجابايت خام ≈ ١٦ بعد Base64 — هامش مريح تحت سقف الـ٢٠.
 */
const INLINE_MAX_BYTES = 12 * 1024 * 1024;

/** أقصى انتظار لانتهاء معالجة الملف في Files API. */
const FILE_ACTIVE_TIMEOUT_MS = 25_000;
const FILE_POLL_INTERVAL_MS = 1_000;

export type UploadedFile = {
  name: string;
  mimeType: string;
  bytes: Buffer;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * يرفع الملف عبر Files API وينتظر انتقاله إلى الحالة ACTIVE.
 *
 * الانتظار ليس احتياطًا: الملف المرفوع يبقى PROCESSING لحظاتٍ، والإشارة إليه
 * قبل ذلك تُرجع خطأً من الواجهة لا ملفًا فارغًا — فالتجاهل هنا يعني فشلًا
 * متقطّعًا يصعب تفسيره لاحقًا.
 */
async function uploadViaFilesApi(file: UploadedFile): Promise<Part> {
  const client = getGenAIClient();

  const uploaded = await client.files.upload({
    file: new Blob([new Uint8Array(file.bytes)], { type: file.mimeType }),
    config: { mimeType: file.mimeType, displayName: file.name },
  });

  if (!uploaded.name) throw new Error("لم تُعِد واجهة الملفات معرّفًا للملف المرفوع.");

  const deadline = Date.now() + FILE_ACTIVE_TIMEOUT_MS;
  let current = uploaded;

  while (current.state === "PROCESSING" && Date.now() < deadline) {
    await sleep(FILE_POLL_INTERVAL_MS);
    current = await client.files.get({ name: uploaded.name });
  }

  if (current.state === "FAILED") {
    throw new Error(`فشلت معالجة الملف "${file.name}" في واجهة Gemini.`);
  }
  if (current.state === "PROCESSING") {
    throw new Error(`تأخّرت معالجة الملف "${file.name}". حاول مرة أخرى.`);
  }
  if (!current.uri) {
    throw new Error(`لم يُعَد رابط للملف "${file.name}".`);
  }

  return { fileData: { fileUri: current.uri, mimeType: current.mimeType ?? file.mimeType } };
}

/**
 * يُعيد جزء المحتوى المناسب للملف، ومعه دالة تنظيف تُستدعى بعد انتهاء
 * الاستخدام (تحذف الملف من Files API؛ لا عمل لها في المسار المضمَّن).
 */
export async function buildFilePart(
  file: UploadedFile,
): Promise<{ part: Part; cleanup: () => Promise<void> }> {
  if (file.bytes.byteLength <= INLINE_MAX_BYTES) {
    return {
      part: {
        inlineData: { mimeType: file.mimeType, data: file.bytes.toString("base64") },
      },
      cleanup: async () => {},
    };
  }

  const part = await uploadViaFilesApi(file);
  const uri = part.fileData?.fileUri;

  return {
    part,
    cleanup: async () => {
      if (!uri) return;
      // المعرّف في المسار الأخير من الـ URI: .../files/abc123
      const name = uri.split("/").slice(-2).join("/");
      try {
        await getGenAIClient().files.delete({ name });
      } catch {
        // الملفات تُحذف تلقائيًا بعد ٤٨ ساعة؛ فشل الحذف هنا لا يستحق إفشال الرفع.
      }
    },
  };
}
