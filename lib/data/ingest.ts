import { splitSource, type SupportedMimeType } from "@/lib/ai/splitSource";
import { fallbackSplitSource } from "@/lib/ai/fallback";
import { mapWithConcurrency } from "@/lib/ai/utils";
import { addFile } from "./store";
import type { SourceFile } from "./types";

/**
 * يُنسِّق مسار الرفع: splitSource لكل ملف، مع تراجع محلي فوري إذا فشل النداء
 * (لا مفتاح GEMINI_API_KEY غالبًا في هذه البيئة) حتى تبقى الصفحة قابلة
 * للتجربة من أول تشغيل.
 *
 * ما لا يفعله هنا عمدًا: توليد الاختبارات. كان الرفع يُنادي generateQuiz لكل
 * قسم ناتج بالتسلسل — حتى عشرين نداءً × ~٢٠ ثانية — فيقف الطالب أمام شاشة
 * تحميل خمس دقائق قبل أن يرى شيئًا، ثم يفتح قسمًا أو قسمين ويترك الباقي.
 * صار الاختبار يُولَّد عند فتح القسم فعلًا (lib/data/quiz-provider.ts):
 * الرفع يقتصر على التقسيم، والعمل المهدور يختفي.
 */

export type UploadFilePart = { name: string; mimeType: string; bytes: Buffer };

const SUPPORTED_MIME_TYPES = new Set<string>([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

/** الملفات مستقلّة عن بعضها تمامًا، والحدّ يحمي حصّة الطلبات في الدقيقة. */
const SPLIT_CONCURRENCY = 3;

export type IngestResult = { file: SourceFile; usedFallback: boolean };

export async function ingestUpload(
  parts: UploadFilePart[],
  title: string,
  subject: string,
): Promise<IngestResult> {
  if (parts.length === 0) throw new Error("لم يُرفَع أي ملف.");

  const perFile = await mapWithConcurrency(parts, SPLIT_CONCURRENCY, async (part) => {
    try {
      if (!SUPPORTED_MIME_TYPES.has(part.mimeType)) {
        throw new Error(`نوع ملف غير مدعوم: ${part.mimeType}`);
      }
      const out = await splitSource(part.bytes, part.mimeType as SupportedMimeType, part.name);
      return { usedFallback: false, sections: out.sections };
    } catch {
      const baseName = part.name.replace(/\.[^.]+$/, "") || title;
      return { usedFallback: true, sections: fallbackSplitSource(baseName).sections };
    }
  });

  const usedFallback = perFile.some((r) => r.usedFallback);
  const sections = perFile.flatMap((r) =>
    r.sections.map((s) => ({
      title: s.title,
      content_md: s.content_md,
      key_concepts: s.key_concepts,
      // null لا مصفوفة فارغة: الفرق بين «لم يُولَّد بعد» و«اختبار بلا أسئلة»
      // هو ما يقرأه quiz-provider ليقرّر التوليد عند الفتح.
      quiz: null,
    })),
  );

  const file = addFile(title, subject, sections);
  return { file, usedFallback };
}
