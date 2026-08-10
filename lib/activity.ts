import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/session";
import { touchStreak } from "@/lib/streak";
import type { Database } from "@/types/db";
import type { StreakState } from "@/lib/data/types";

/**
 * سجلّ نشاط الطالب — الأثر الوحيد الذي تراه المهمة المجدولة.
 *
 * لماذا يوجد أصلًا: مسار الطالب ما زال على مخزن في الذاكرة مثبَّت على
 * globalThis، والمهمة المجدولة تعمل في استدعاء منفصل لا يشترك معه في ذاكرة
 * ولا يعرف أي حساب. فبدل ترحيل المسار كاملًا الآن، تُكتب هنا أربع إشارات
 * رفيعة فقط — ما تحتاجه قواعد التذكير حرفيًا ولا شيء زائد.
 *
 * الكتابة تمرّ بالعميل المقيَّد بـ RLS لا بمفتاح service_role: الصفّ يُنسب إلى
 * صاحب الجلسة نفسه، فلا داعي لتجاوز الحماية هنا.
 *
 * كل دالة هنا لا ترمي أبدًا. تسجيل نشاط أثر جانبي للمتابعة، وفشله يجب ألّا
 * يُسقط الإجابة أو الرفع الذي كان الطالب بصدده.
 */

type ActivityKind = Database["public"]["Enums"]["activity_kind"];

type ActivityInput = {
  kind: ActivityKind;
  fileRef?: string | null;
  sectionRef?: string | null;
  /** العنوان الظاهر وقت الحدث، ليُذكر باسمه في نصّ التذكير. */
  label?: string | null;
};

export async function logActivity(input: ActivityInput): Promise<void> {
  try {
    const profile = await getProfile();
    if (!profile || profile.role !== "student") return;

    const supabase = await createClient();
    await supabase.from("student_activity").insert({
      student_id: profile.id,
      kind: input.kind,
      file_ref: input.fileRef ?? null,
      section_ref: input.sectionRef ?? null,
      label: input.label ?? null,
    });
  } catch {
    // مُتجاهَل عمدًا — انظر التعليق أعلى الملف.
  }
}

/**
 * نشاط + عدّاد التزام في نداء واحد.
 *
 * تُعاد حالة السلسلة المعمَّرة (لا التي في الذاكرة) لأنها الوحيدة المربوطة
 * بالحساب، وهي نفسها التي يقرأها محرّك التذكيرات — فما يراه الطالب على الشاشة
 * هو ما يُبنى عليه قرار الإرسال.
 */
export async function logActivityAndTouchStreak(
  input: ActivityInput,
): Promise<{ streak: StreakState; bumped: boolean } | null> {
  try {
    const profile = await getProfile();
    if (!profile || profile.role !== "student") return null;

    const supabase = await createClient();
    await supabase.from("student_activity").insert({
      student_id: profile.id,
      kind: input.kind,
      file_ref: input.fileRef ?? null,
      section_ref: input.sectionRef ?? null,
      label: input.label ?? null,
    });

    const { state, bumped } = await touchStreak(supabase, profile.id);
    return { streak: state, bumped };
  } catch {
    return null;
  }
}
