import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";
import type { StreakState } from "@/lib/data/types";
import { dayDiff, riyadhDateKey } from "@/lib/data/date-utils";

/**
 * عدّاد الالتزام — تعريف واحد لا اثنان.
 *
 * المنطق هنا خالص وبلا تخزين (advanceStreak/streakAsOf)، وفوقه غلافان: واحد
 * يكتب في public.streaks لكل طالب، وlib/data/store.ts يستدعي نفس الدالة
 * النقية للعدّاد الذي في الذاكرة. لولا ذلك لتفرّع تعريف «متى تنكسر السلسلة»
 * إلى نسختين تختلفان بصمت — والمحرّك المجدول يقرأ نسخة والواجهة تعرض الأخرى.
 */

type DB = SupabaseClient<Database>;

export const EMPTY_STREAK: StreakState = { current: 0, longest: 0, lastActiveDate: null };

/** يومان كاملان بلا نشاط يكسران السلسلة؛ يوم واحد فاصل ما زال ضمنها. */
export function isStreakBroken(state: StreakState, today = riyadhDateKey()): boolean {
  if (!state.lastActiveDate) return true;
  return dayDiff(state.lastActiveDate, today) > 1;
}

/**
 * السلسلة كما تُعرض اليوم. القيمة المخزَّنة في `current` هي آخر ما بلغته وقت
 * آخر نشاط، ولا يمرّ أحد ليصفّرها عند الغياب — فالصفر يُحسب عند القراءة.
 */
export function streakAsOf(state: StreakState, today = riyadhDateKey()): number {
  return isStreakBroken(state, today) ? 0 : state.current;
}

/** الحالة بعد تسجيل نشاط اليوم. `bumped` تعني أن الرقم تغيّر فعلًا. */
export function advanceStreak(
  prev: StreakState,
  today = riyadhDateKey(),
): { next: StreakState; bumped: boolean } {
  if (prev.lastActiveDate === today) return { next: prev, bumped: false };

  const continues = prev.lastActiveDate !== null && dayDiff(prev.lastActiveDate, today) === 1;
  const current = continues ? prev.current + 1 : 1;

  return {
    next: {
      current,
      longest: Math.max(prev.longest, current),
      lastActiveDate: today,
    },
    bumped: true,
  };
}

/* ────────────────────────────── التخزين في Supabase ────────────────────────────── */

function toState(row: Database["public"]["Tables"]["streaks"]["Row"] | null): StreakState {
  if (!row) return EMPTY_STREAK;
  return { current: row.current, longest: row.longest, lastActiveDate: row.last_active_date };
}

export async function readStreak(supabase: DB, studentId: string): Promise<StreakState> {
  const { data } = await supabase
    .from("streaks")
    .select("student_id, current, longest, last_active_date")
    .eq("student_id", studentId)
    .maybeSingle();
  return toState(data);
}

/**
 * يسجّل نشاط اليوم. يُنادى عند كل تفاعل لا عند إتمام اختبار فقط: الطالب الذي
 * فتح درسًا وقرأه التزم بيومه حتى لو لم يُنهِ أسئلته.
 *
 * السباق بين نداءين في نفس اللحظة غير ضار: كلاهما يحسب نفس نتيجة اليوم
 * (advanceStreak دالة ثابتة على نفس المدخل)، فآخر كتابة تطابق أولاها.
 */
export async function touchStreak(
  supabase: DB,
  studentId: string,
  today = riyadhDateKey(),
): Promise<{ state: StreakState; bumped: boolean }> {
  const prev = await readStreak(supabase, studentId);
  const { next, bumped } = advanceStreak(prev, today);
  if (!bumped) return { state: prev, bumped: false };

  const { error } = await supabase.from("streaks").upsert(
    {
      student_id: studentId,
      current: next.current,
      longest: next.longest,
      last_active_date: next.lastActiveDate,
    },
    { onConflict: "student_id" },
  );

  // فشل الكتابة لا يُفشل الإجابة التي كان الطالب بصددها — يُعاد ما كان.
  if (error) return { state: prev, bumped: false };
  return { state: next, bumped: true };
}
