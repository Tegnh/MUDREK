/**
 * splitSource — تقسيم ملف مصدر دراسي إلى أقسام منطقية
 *
 * يقبل ملفًا (PDF أو نص أو شرائح) بهيئة بايتات ويُعيد
 * قائمة أقسام منظّمة مع عناوين ومفاهيم رئيسية جاهزة للدراسة.
 */

import { getGenAIClient, TEXT_MODEL, BASE_CONFIG } from "./client";
import { parseAndValidate, withOneRetry } from "./utils";
import { buildFilePart } from "./filePart";
import { SplitSourceOutputSchema, type SplitSourceOutput } from "./schemas";

/** الأنواع المدعومة */
export type SupportedMimeType =
  | "application/pdf"
  | "text/plain"
  | "text/markdown"
  | "application/vnd.openxmlformats-officedocument.presentationml.presentation";

/** ─── البرومبت الرئيسي ──────────────────────────────────────────── */
const SPLIT_PROMPT = `
أنت خبير تربوي متخصص في تنظيم المحتوى الأكاديمي للطلاب السعوديين.
مهمتك تحليل المحتوى التعليمي المُقدَّم وتقسيمه إلى أقسام منطقية.

تعليمات التقسيم:
1. حدّد الوحدات أو الفصول أو الموضوعات الرئيسية الطبيعية في المحتوى.
2. لكل قسم:
   - رقّمه تسلسليًا (order_no).
   - أعطه عنوانًا وصفيًا مختصرًا بالعربية.
   - احتفظ بالمحتوى الكامل بصيغة Markdown (content_md).
   - استخرج قائمة المفاهيم الرئيسية (key_concepts) — أسماء المفاهيم لا جمل.
3. لا تختصر المحتوى؛ احتفظ بكل التفاصيل في content_md.
4. الحد الأقصى للأقسام: 20 قسمًا. إذا كان المحتوى أطول، دمج الأقسام المتشابهة.

أمثلة على key_concepts في السياق السعودي:
- [قانون نيوتن الثالث، الكتلة والوزن، الاحتكاك]
- [الفعل المضارع، علامات الإعراب، المنصوبات]

أعد النتيجة بصيغة JSON صارمة بالشكل التالي فقط:
{
  "sections": [
    {
      "order_no": number,
      "title": "string بالعربية",
      "content_md": "string — المحتوى بصيغة Markdown",
      "key_concepts": ["string", ...]
    }
  ]
}
`.trim();

// ─────────────────────────────────────────────────────────────────────
// الدالة الرئيسية
// ─────────────────────────────────────────────────────────────────────

/**
 * يُقسِّم ملف مصدر دراسي إلى أقسام منطقية.
 *
 * @param bytes    - محتوى الملف الخام
 * @param mimeType - نوع MIME للملف
 * @param fileName - اسم الملف، للرسائل وللعرض في Files API
 * @returns قائمة الأقسام المنظَّمة
 */
export async function splitSource(
  bytes: Buffer,
  mimeType: SupportedMimeType,
  fileName = "مصدر"
): Promise<SplitSourceOutput> {
  // يُبنى الجزء مرّة واحدة خارج withOneRetry: رفعُ ملفٍ كبير مرّتين لأن
  // النموذج ردّ 429 في المحاولة الأولى هدرٌ خالص — الملف المرفوع يبقى صالحًا.
  const { part, cleanup } = await buildFilePart({ name: fileName, mimeType, bytes });

  try {
    return await withOneRetry(async () => {
      const client = getGenAIClient();

      const response = await client.models.generateContent({
        model: TEXT_MODEL,
        contents: [
          {
            role: "user",
            parts: [part, { text: SPLIT_PROMPT }],
          },
        ],
        config: {
          ...BASE_CONFIG,
          temperature: 0.2,
          maxOutputTokens: 8192,
        },
      });

      const rawText = response.text ?? "";
      return parseAndValidate(rawText, SplitSourceOutputSchema);
    }, "splitSource");
  } finally {
    await cleanup();
  }
}
