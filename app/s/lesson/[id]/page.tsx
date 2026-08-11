import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getFileRaw, getSectionRaw, sectionWithStatus, sectionsWithStatus } from "@/lib/data/store";
import { ensureSectionQuiz, warmSectionQuiz } from "@/lib/data/quiz-provider";
import { LessonRunner } from "./LessonRunner";

type Params = Promise<{ id: string }>;

/**
 * توليد الاختبار انتقل من لحظة الرفع إلى هنا، فصار هذا المسار هو الذي
 * ينادي النموذج. الافتراضي على Vercel أقصر من نداءٍ واحد.
 */
export const maxDuration = 60;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const section = getSectionRaw(id);
  return { title: section?.title ?? "الدرس" };
}

export default async function LessonPage({ params }: { params: Params }) {
  const { id } = await params;

  const section = getSectionRaw(id);
  if (!section) notFound();

  const file = getFileRaw(section.fileId);
  if (!file) notFound();

  const status = sectionWithStatus(id);
  if (!status || status.status === "locked") {
    // بوابة الإتقان تمنع الوصول المباشر أيضًا، لا الإخفاء من الواجهة فقط
    notFound();
  }

  // أوّل فتحٍ للقسم يُولّد اختباره ثم يخزّنه؛ ما بعده قراءةٌ فورية.
  // البوابة أعلاه تسبقه عمدًا: لا يُنفَق نداء نموذج على قسم مقفل.
  const quiz = await ensureSectionQuiz(id);

  const siblings = sectionsWithStatus(file.id);
  const currentPos = siblings.findIndex((s) => s.id === id);
  const next = siblings[currentPos + 1] ?? null;

  // تسخين القسم التالي بلا انتظار: الطالب أمامه دقائق في اختبار هذا القسم،
  // وهي مهلة تكفي لتوليد التالي — فيصل إليه وقد جهز.
  if (next) warmSectionQuiz(next.id);

  return (
    <LessonRunner
      fileId={file.id}
      fileTitle={file.title}
      sectionId={section.id}
      sectionTitle={section.title}
      contentMd={section.content_md}
      quiz={quiz}
      nextSection={next ? { id: next.id, title: next.title } : null}
    />
  );
}
