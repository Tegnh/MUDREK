/**
 * حدود الرفع وأنواعه المشتركة بين الخادم والمتصفح.
 *
 * ملف منفصل عن actions.ts لأن وحدة "use server" لا يُسمح لها بتصدير غير
 * الدوال غير المتزامنة — تصديرُ ثابتٍ منها يكسر البناء. وفصلُها هنا يفيد
 * أيضًا: الرقم واحد في الطرفين، فلا يفحص المتصفح حدًّا ويطبّق الخادم آخر.
 *
 * ولا يزال الحدّ مكتوبًا مرّة ثالثة في الهجرة 005 (file_size_limit على
 * الدلو) — وهذا مقصود لا تكرار سهوًا: ذاك هو الحدّ الذي يصمد أمام طلبٍ لا
 * يمرّ بهذه الواجهة أصلًا.
 */

export const MAX_FILES = 5;
export const MAX_BYTES = 25 * 1024 * 1024;
export const BUCKET = "sources";

export const SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

/**
 * يُخمّن النوع من الامتداد حين يُرسل المتصفح نوعًا فارغًا أو خاطئًا.
 * يحدث كثيرًا مع .md و.pptx، فيُرفض ملفٌ مدعوم لولا هذا.
 */
export function resolveMimeType(name: string, declared: string): string {
  if (SUPPORTED_MIME_TYPES.has(declared)) return declared;
  const ext = name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  switch (ext) {
    case "pdf": return "application/pdf";
    case "txt": return "text/plain";
    case "md": return "text/markdown";
    case "pptx": return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    default: return declared;
  }
}

export type UploadState = { error?: string };
export type RequestedFile = { name: string; size: number; type: string };
export type UploadedRef = { path: string; name: string; type: string };
export type UploadTicket = { path: string; signedUrl: string; token: string; name: string };
export type TicketsResult =
  | { ok: true; tickets: UploadTicket[] }
  | { ok: false; error: string };
