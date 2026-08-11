/**
 * splitSource — تقسيم ملف مصدر دراسي إلى أقسام منطقية
 *
 * يقبل ملفًا (PDF أو نص أو شرائح) بهيئة بايتات ويُعيد
 * قائمة أقسام منظّمة مع عناوين ومفاهيم رئيسية جاهزة للدراسة.
 */

import { getGenAIClient, TEXT_MODEL, BASE_CONFIG } from "./client";
import { parseAndValidate, withOneRetry, mapWithConcurrency } from "./utils";
import { buildFilePart } from "./filePart";
import { splitPdfIntoBatches } from "./pdfBatches";
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

/**
 * دفعات من ملف واحد قد تُعالَج معًا، بنفس حدّ التوازي بين الملفات نفسها
 * (SPLIT_CONCURRENCY في ingest.ts). قِسناها فعليًا: دفعةٌ من 15 صفحة تستغرق
 * ~15 ثانية، فخمس دفعات بتوازي 2 تعني ثلاث جولات متتالية — نحو 45 ثانية
 * بلا أي إعادة محاولة، وهامشٌ لا يحتمل فشل دفعة واحدة داخل جولة (يُضاعف
 * withOneRetry زمنها). توازي 3 يُنزل خمس دفعات إلى جولتين — نحو 30 ثانية،
 * وهامشٌ يبقى دون الستين ثانية حتى مع إعادة محاولة كاملة لدفعة واحدة.
 */
const BATCH_CONCURRENCY = 3;

// ─────────────────────────────────────────────────────────────────────
// نداء واحد إلى Gemini — على الملف كاملًا، أو على دفعة صفحات منه
// ─────────────────────────────────────────────────────────────────────

async function splitSourceOnce(
  bytes: Buffer,
  mimeType: SupportedMimeType,
  fileName: string,
  label: string,
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
      console.log("[رفع:٤-Gemini] ردّ", TEXT_MODEL, label, {
        chars: rawText.length,
        finishReason: response.candidates?.[0]?.finishReason,
        head: rawText.slice(0, 160),
      });
      return parseAndValidate(rawText, SplitSourceOutputSchema);
    }, `splitSource:${label}`);
  } finally {
    await cleanup();
  }
}

// ─────────────────────────────────────────────────────────────────────
// الدالة الرئيسية
// ─────────────────────────────────────────────────────────────────────

/**
 * يُقسِّم ملف مصدر دراسي إلى أقسام منطقية.
 *
 * ملفات PDF الطويلة تُقسَّم أولًا إلى دفعات صفحات (انظر pdfBatches.ts) قبل
 * إرسالها: زمن ردّ Gemini على PDF يتناسب مع عدد الصفحات — ملفٌ من 69 صفحة
 * قِسناه فعليًا في الإنتاج سقط تسع مرات متتالية عند سقف دالة Vercel الصلب
 * (60 ثانية)، بينما دفعة من 15 صفحة تُنجَز في ثوانٍ معدودة بثبات. كل دفعة
 * نداءٌ مستقل بميزانيته الخاصة، فحجم الملف الكلي لم يعد يحدّد نجاح النداء
 * أو فشله. النتائج تُدمج بترقيم أقسام متسلسل واحد يغطّي الملف كاملًا.
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
  if (mimeType !== "application/pdf") {
    return splitSourceOnce(bytes, mimeType, fileName, "كامل");
  }

  const batches = await splitPdfIntoBatches(bytes);
  if (batches.length === 1) {
    return splitSourceOnce(bytes, mimeType, fileName, "كامل");
  }

  console.log("[رفع:٤-Gemini] PDF طويل — مقسَّم إلى", batches.length, "دفعة");

  const perBatch = await mapWithConcurrency(batches, BATCH_CONCURRENCY, (batch) =>
    splitSourceOnce(
      batch.bytes,
      mimeType,
      fileName,
      `صفحات ${batch.firstPage}-${batch.lastPage}`,
    ),
  );

  const sections = perBatch.flatMap((out) => out.sections).map((s, i) => ({
    ...s,
    order_no: i + 1,
  }));

  return { sections };
}
