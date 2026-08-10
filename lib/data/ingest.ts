import { splitSource } from "@/lib/ai/splitSource";
import { generateQuiz } from "@/lib/ai/generateQuiz";
import { fallbackGenerateQuiz, fallbackSplitSource } from "@/lib/ai/fallback";
import { misconceptionCatalogRecord } from "./misconceptions";
import { addFile, type NewSectionInput } from "./store";
import type { SourceFile } from "./types";

/**
 * يُنسِّق مسار الرفع كاملًا: splitSource لكل ملف، ثم generateQuiz لكل قسم
 * ناتج، مع تراجع محلي فوري إذا فشل أيّ استدعاء (لا مفتاح GEMINI_API_KEY
 * غالبًا في هذه البيئة) حتى تبقى الصفحة قابلة للتجربة من أول تشغيل.
 */

export type UploadFilePart = { name: string; mimeType: string; base64: string };

const SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

export type IngestResult = { file: SourceFile; usedFallback: boolean };

export async function ingestUpload(
  parts: UploadFilePart[],
  title: string,
  subject: string,
): Promise<IngestResult> {
  if (parts.length === 0) throw new Error("لم يُرفَع أي ملف.");

  let usedFallback = false;
  const rawSections: { title: string; content_md: string; key_concepts: string[] }[] = [];

  for (const part of parts) {
    try {
      if (!SUPPORTED_MIME_TYPES.has(part.mimeType)) {
        throw new Error(`نوع ملف غير مدعوم: ${part.mimeType}`);
      }
      const out = await splitSource(part.base64, part.mimeType as Parameters<typeof splitSource>[1]);
      for (const s of out.sections) {
        rawSections.push({ title: s.title, content_md: s.content_md, key_concepts: s.key_concepts });
      }
    } catch {
      usedFallback = true;
      const baseName = part.name.replace(/\.[^.]+$/, "") || title;
      const out = fallbackSplitSource(baseName);
      for (const s of out.sections) {
        rawSections.push({ title: s.title, content_md: s.content_md, key_concepts: s.key_concepts });
      }
    }
  }

  const catalog = misconceptionCatalogRecord();
  const sections: NewSectionInput[] = [];

  for (const rs of rawSections) {
    try {
      const quizOut = await generateQuiz(rs.content_md, 4, catalog);
      sections.push({ ...rs, quiz: quizOut.questions });
    } catch {
      usedFallback = true;
      const quizOut = fallbackGenerateQuiz(rs.title, rs.key_concepts);
      sections.push({ ...rs, quiz: quizOut.questions });
    }
  }

  const file = addFile(title, subject, sections);
  return { file, usedFallback };
}
