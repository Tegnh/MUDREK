import type { Database } from "@/types/db";

export type ReminderType = Database["public"]["Enums"]["reminder_type"];

/** أسماء الأنواع كما تُعرض في لوحة التشغيل. `incomplete` من الهجرة الأولى وبلا قاعدة تُنتجه. */
export const REMINDER_TYPE_LABEL: Record<ReminderType, string> = {
  gap_unresolved: "فجوة لم تُحلّ",
  streak_at_risk: "انقطاع السلسلة",
  not_started: "بداية مؤجَّلة",
  incomplete: "قسم غير مكتمل",
};

/**
 * كل ما يعرفه محرّك القرار عن طالب واحد في لحظة الكنس.
 *
 * الفصل مقصود: القواعد في rules.ts تعمل على هذا الشكل وحده — لا Supabase ولا
 * وقت النظام — فتبقى قابلة للفحص بلا قاعدة بيانات، وتبقى صالحة كما هي بعد
 * ترحيل مسار الطالب حين يتغيّر جامع اللقطات وحده.
 */
export type StudentSnapshot = {
  studentId: string;
  name: string;
  email: string;

  /** آخر نشاط مسجَّل من أي نوع. null لطالب لم يبدأ بعد. */
  lastActivityAt: string | null;

  streak: { current: number; longest: number; lastActiveDate: string | null };

  /** ملف رُفع ولم يُفتح منه أي قسم قط — الأقدم أولًا إن تعدّدت. */
  pendingStart: { fileRef: string; label: string; uploadedAt: string } | null;

  /** مادة علاجية كتبها المعلم ولم تُحلّ — الأقدم أولًا إن تعدّدت. */
  unresolvedGap: { sectionId: string; label: string; assignedAt: string } | null;

  /** أُرسلت له رسالة اليوم بالفعل (بتوقيت الرياض). */
  remindedToday: boolean;

  /**
   * أنواع أُرسلت له خلال فترة التهدئة.
   *
   * بدونها تتكرّر نفس الرسالة كل يوم إلى الأبد: ملف رُفع ولم يُفتح يبقى كذلك
   * غدًا وبعد غد، فتنطبق القاعدة كل مساء. تذكير لا يُستجاب له مرّتين لن
   * يُستجاب له في العاشرة — يصير إزعاجًا يُفقد بقية الرسائل مصداقيتها.
   */
  typesSentRecently: ReminderType[];
};

export type ReminderDecision = {
  type: ReminderType;
  /** سبب مقروء يُعرض في /admin/cron ويُحفظ في reminders.context. */
  reason: string;
  /** UUID قسم حقيقي في public.sections، أو null لقاعدة لا تخصّ قسمًا مخزَّنًا. */
  sectionId: string | null;
};

export type SweepOutcome =
  | { status: "sent"; dryRun: boolean }
  | { status: "skipped"; why: string }
  | { status: "failed"; error: string };

export type SweepEntry = {
  studentId: string;
  name: string;
  email: string;
  decision: ReminderDecision | null;
  outcome: SweepOutcome;
};

export type SweepReport = {
  ranAt: string;
  /** يوم الرياض الذي يحكم قيد «رسالة واحدة يوميًا». */
  day: string;
  /** لم يُرسَل بريد فعليًا — إمّا بطلب المشغّل أو لغياب RESEND_API_KEY. */
  dryRun: boolean;
  studentsScanned: number;
  sent: number;
  skipped: number;
  failed: number;
  entries: SweepEntry[];
};
