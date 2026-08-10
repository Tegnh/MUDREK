import type { ReminderDecision, StudentSnapshot } from "./types";

/**
 * قواعد المتابعة — دوال خالصة، لا قاعدة بيانات ولا Date.now().
 *
 * الترتيب أدناه ترتيب أولوية لا ترتيب فحص: القيد صريح بأن الطالب لا يتلقّى
 * أكثر من رسالة واحدة يوميًا، فحين تنطبق قاعدتان تفوز الأقوى. والأقوى هي
 * الفجوة التي رصدها المعلم — خلفها إنسان يتابع، لا مؤقّت. تليها السلسلة
 * (خسارة ملموسة سجّلها الطالب بنفسه)، ثم البداية المؤجَّلة (الأضعف: تذكير
 * بشيء لم يبدأه بعد فلا شيء يخسره).
 */

export const HOUR_MS = 3_600_000;

/** عتبات القواعد. مجموعة في مكان واحد ليسهل ضبطها دون مطاردتها في الشيفرة. */
export const THRESHOLDS = {
  /** رُفع ملف ولم يُفتح منه قسم. */
  notStartedHours: 24,
  /** لا نشاط من أي نوع. */
  inactivityHours: 48,
  /** أقلّ سلسلة تستحق التنبيه — أقل من ذلك ليست عادة بعد. */
  minStreak: 3,
  /** أُرسلت مادة علاجية ولم تُحلّ. */
  gapHours: 24,
  /** أيام التهدئة قبل تكرار نفس نوع الرسالة لنفس الطالب. */
  cooldownDays: 7,
} as const;

function hoursSince(iso: string, now: Date): number {
  return (now.getTime() - new Date(iso).getTime()) / HOUR_MS;
}

/* ────────────────────────────── القواعد الثلاث ────────────────────────────── */

function gapUnresolved(s: StudentSnapshot, now: Date): ReminderDecision | null {
  const gap = s.unresolvedGap;
  if (!gap) return null;
  const hours = hoursSince(gap.assignedAt, now);
  if (hours < THRESHOLDS.gapHours) return null;

  return {
    type: "gap_unresolved",
    reason: `تمرين «${gap.label}» أرسله المعلم قبل ${Math.floor(hours)} ساعة ولم يُحلّ`,
    sectionId: gap.sectionId,
  };
}

/**
 * السلسلة المستعملة هنا هي القيمة المخزَّنة لا المحسوبة اليوم: بعد ٤٨ ساعة
 * غياب تكون streakAsOf قد صفّرتها بالفعل، فلو قِيست بها لما انطبقت القاعدة
 * على أحد أبدًا. المقصود «كم بلغت قبل أن تتوقّف»، وهو ما تحفظه `current`.
 */
function streakAtRisk(s: StudentSnapshot, now: Date): ReminderDecision | null {
  if (!s.lastActivityAt) return null;
  if (s.streak.current < THRESHOLDS.minStreak) return null;

  const hours = hoursSince(s.lastActivityAt, now);
  if (hours < THRESHOLDS.inactivityHours) return null;

  return {
    type: "streak_at_risk",
    reason: `سلسلة بلغت ${s.streak.current} أيام، وانقطاع ${Math.floor(hours)} ساعة`,
    sectionId: null,
  };
}

function notStarted(s: StudentSnapshot, now: Date): ReminderDecision | null {
  const pending = s.pendingStart;
  if (!pending) return null;
  const hours = hoursSince(pending.uploadedAt, now);
  if (hours < THRESHOLDS.notStartedHours) return null;

  return {
    type: "not_started",
    reason: `«${pending.label}» رُفع قبل ${Math.floor(hours)} ساعة ولم يُفتح منه قسم`,
    sectionId: null,
  };
}

/**
 * الرسالة الواحدة المستحقّة لهذا الطالب اليوم، أو null إن لم تستحقّ أيّ قاعدة.
 *
 * التهدئة تُطبَّق على المرشَّحين لا على النتيجة: قاعدة أقوى في تهدئتها يجب أن
 * تفسح لقاعدة أضعف مستحقّة، لا أن تُسكت اليوم كلّه.
 */
export function decideReminder(s: StudentSnapshot, now: Date): ReminderDecision | null {
  const candidates = [gapUnresolved(s, now), streakAtRisk(s, now), notStarted(s, now)];
  return candidates.find((c) => c !== null && !s.typesSentRecently.includes(c.type)) ?? null;
}
