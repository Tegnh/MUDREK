/**
 * تقسيم ملف PDF كبير إلى دفعات صفحات قبل إرساله لـ Gemini.
 *
 * لماذا: زمن ردّ generateContent على PDF يتناسب مع عدد الصفحات (كل صفحة
 * تُرسَل كصورة)، وملفٌ من 69 صفحة قِسناه مباشرةً استغرق نداءً واحدًا نحو
 * 22 ثانية في أفضل حال — وفي بيئة Vercel الفعلية سقط تسع مرات متتالية عند
 * سقف الدالة الصلب (60 ثانية على خطة Hobby، لا يُرفَع بإعداد). رفعُ السقف
 * أو ترقية الخطة ينقل الجدار فحسب؛ ملفٌ أطول أو يومٌ أبطأ عند Google يصطدمان
 * به مجددًا. تقسيمُ الطلب نفسه هو ما يجعل زمن كل نداء محدودًا بحجم الدفعة
 * لا بحجم الملف كله، مهما كان.
 */

import { PDFDocument } from "pdf-lib";

/**
 * صفحات لكل دفعة. عند ~0.3 ثانية/صفحة (المقاس فعليًا)، 15 صفحة ≈ 5 ثوانٍ
 * توليدًا + زمن الشبكة، ومع إعادة محاولة واحدة كاملة (withOneRetry يُضاعف
 * أسوأ حال) يبقى الناتج بعيدًا عن سقف الستين ثانية بهامش مريح.
 */
const PAGES_PER_BATCH = 15;

/**
 * أقصى عدد صفحات يُعالَج داخل نداء الرفع الواحد. قِسناها فعليًا على الملف
 * الذي كان يسقط في الإنتاج (69 صفحة، 5 دفعات): تحت حِمل تزامن حقيقي (ثلاث
 * دفعات معًا) استغرقت ثلاث محاولات كاملة 36–47 ثانية — أبطأ من قياس الدفعة
 * المعزولة (~15 ثانية) بسبب التزاحم الفعلي على مفتاح Gemini نفسه، لا نظريًا.
 * جولتان من التزامن (٦ دفعات = ٩٠ صفحة) تبقيان قريبتين من ذلك المدى المُختبَر؛
 * جولة ثالثة تُقارب سقف الستين ثانية بلا هامش يحتمل إعادة محاولة. فالملف
 * الأطول من هذا يُرفَض فورًا هنا — قبل إنفاق أي وقت من ميزانية الدالة —
 * بدل أن يُستهلَك معظمها في معالجة جزئية ثم يُقتَل بلا فارقٍ عن العطل الأصلي.
 * الرفض هنا خطأ عادي يُلتقَط في ingest.ts ويسقط إلى التقسيم الاحتياطي
 * المعروض للطالب أصلًا — لا حاجة لمسار معالجة جديد.
 */
const MAX_PAGES = PAGES_PER_BATCH * 3 * 2; // = 90

export type PdfBatch = { bytes: Buffer; firstPage: number; lastPage: number };

/**
 * يُقسِّم بايتات PDF إلى دفعات لا يتجاوز أيٌّ منها PAGES_PER_BATCH صفحة.
 *
 * ملفٌ بصفحات أقل من الحدّ يُعاد كما هو في دفعة واحدة — لا نداء إلى pdf-lib
 * يُعيد ترميزه، فلا كلفة إضافية ولا مخاطرة أمانة على الغالبية من الملفات.
 */
export async function splitPdfIntoBatches(bytes: Buffer): Promise<PdfBatch[]> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  } catch {
    // pdf-lib أكثر تشدّدًا من مُحلِّل Gemini الداخلي — ملفٌ يرفضه لا يعني
    // بالضرورة أن Gemini سيرفضه أيضًا. أرسِله كما هو بدل تحويل مستند كان
    // سيُعالَج بنجاح في المسار القديم إلى فشل جديد لم يكن موجودًا من قبل.
    return [{ bytes, firstPage: 1, lastPage: -1 }];
  }
  const pageCount = doc.getPageCount();

  if (pageCount > MAX_PAGES) {
    throw new Error(
      `الملف طويل جدًا (${pageCount} صفحة، الحد الأقصى ${MAX_PAGES}). ` +
        `قسّمه إلى ملفين أو أكثر وارفعهما منفصلين.`,
    );
  }

  if (pageCount <= PAGES_PER_BATCH) {
    return [{ bytes, firstPage: 1, lastPage: pageCount }];
  }

  const batches: PdfBatch[] = [];
  for (let start = 0; start < pageCount; start += PAGES_PER_BATCH) {
    const end = Math.min(start + PAGES_PER_BATCH, pageCount);
    const indices = Array.from({ length: end - start }, (_, i) => start + i);

    const sub = await PDFDocument.create();
    const copied = await sub.copyPages(doc, indices);
    for (const page of copied) sub.addPage(page);

    batches.push({
      bytes: Buffer.from(await sub.save()),
      firstPage: start + 1,
      lastPage: end,
    });
  }
  return batches;
}
