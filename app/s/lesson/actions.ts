"use server";

import { revalidatePath } from "next/cache";
import { recordAnswer, type AnswerResult } from "@/lib/data/store";
import { logActivityAndTouchStreak } from "@/lib/activity";

/**
 * فتح الدرس. يُنادى من LessonRunner عند العرض لا من page.tsx: الصفحة قد
 * تُعرَض مسبقًا (prefetch) دون أن يراها الطالب، فيصير «فتح القسم» حدثًا لم
 * يقع — وتُخرَس القاعدة الأولى عن ملف لم يُفتح فعلًا.
 */
export async function markSectionOpenedAction(
  fileId: string,
  sectionId: string,
  sectionTitle: string,
): Promise<void> {
  await logActivityAndTouchStreak({
    kind: "section_opened",
    fileRef: fileId,
    sectionRef: sectionId,
    label: sectionTitle,
  });
}

export async function submitAnswerAction(
  fileId: string,
  sectionId: string,
  questionIndex: number,
  selectedIndex: number,
): Promise<AnswerResult> {
  const result = recordAnswer(sectionId, questionIndex, selectedIndex);

  // السلسلة المعروضة تأتي من public.streaks لا من المخزن: هي الوحيدة المربوطة
  // بالحساب، وهي نفسها التي يقرأها محرّك التذكيرات — فما يراه الطالب على
  // الشاشة هو ما يُبنى عليه قرار الإرسال.
  const persisted = await logActivityAndTouchStreak({
    kind: result.sessionCompleted ? "quiz_completed" : "question_answered",
    fileRef: fileId,
    sectionRef: sectionId,
  });

  revalidatePath("/s", "layout");

  if (!persisted) return result;
  return { ...result, streak: persisted.streak, streakBumped: persisted.bumped };
}
