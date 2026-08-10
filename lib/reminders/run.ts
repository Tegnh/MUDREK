import { createAdminClient } from "@/lib/supabase/admin";
import { riyadhDateKey } from "@/lib/data/date-utils";
import { isEmailConfigured, sendEmail, type EmailMessage } from "@/lib/email/send";
import { gapUnresolvedEmail, notStartedEmail, streakAtRiskEmail } from "@/lib/email/templates";
import { collectSnapshots } from "./collect";
import { decideReminder } from "./rules";
import type { ReminderDecision, StudentSnapshot, SweepEntry, SweepReport } from "./types";

/**
 * كنس المتابعة: يجمع لقطة كل طالب، يقرّر رسالة واحدة على الأكثر، يحجز موضعها
 * في reminders ثم يرسل.
 *
 * ترتيب «احجز ثم أرسل» مقصود ولا يجوز عكسه. الفهرس الفريد
 * reminders_one_per_student_per_day هو الحارس الحقيقي لقيد الرسالة الواحدة —
 * فحصُ remindedToday وحده يمرّ منه تشغيلان متزامنان (المجدول واليدوي من
 * /admin/cron) قبل أن يكتب أيّهما. الحجز أولًا يجعل الثاني يصطدم بالفهرس بلا
 * بريد مكرَّر. وإن فشل الإرسال بعد الحجز يُحذف الصفّ، فيعاد المحاولة غدًا.
 */

export type SweepOptions = {
  /** لا يُرسل بريد ولا يُسجَّل شيء — لمعاينة ما كان سيحدث. */
  dryRun?: boolean;
  now?: Date;
};

function buildMessage(snapshot: StudentSnapshot, decision: ReminderDecision): EmailMessage | null {
  switch (decision.type) {
    case "gap_unresolved":
      if (!snapshot.unresolvedGap) return null;
      return { ...gapUnresolvedEmail({ conceptLabel: snapshot.unresolvedGap.label }), to: snapshot.email };
    case "streak_at_risk":
      return {
        ...streakAtRiskEmail({ current: snapshot.streak.current, longest: snapshot.streak.longest }),
        to: snapshot.email,
      };
    case "not_started":
      if (!snapshot.pendingStart) return null;
      return { ...notStartedEmail({ fileLabel: snapshot.pendingStart.label }), to: snapshot.email };
    // 'incomplete' من الهجرة الأولى ولا قاعدة تُنتجه بعد.
    default:
      return null;
  }
}

export async function runReminderSweep(options: SweepOptions = {}): Promise<SweepReport> {
  const now = options.now ?? new Date();
  const dryRun = options.dryRun ?? false;
  const day = riyadhDateKey(now);
  const admin = createAdminClient();

  const snapshots = await collectSnapshots(admin, now);
  const entries: SweepEntry[] = [];

  for (const snapshot of snapshots) {
    const base = { studentId: snapshot.studentId, name: snapshot.name, email: snapshot.email };

    if (snapshot.remindedToday) {
      entries.push({ ...base, decision: null, outcome: { status: "skipped", why: "أُرسلت له رسالة اليوم" } });
      continue;
    }

    const decision = decideReminder(snapshot, now);
    if (!decision) {
      entries.push({ ...base, decision: null, outcome: { status: "skipped", why: "لا قاعدة منطبقة" } });
      continue;
    }

    const message = buildMessage(snapshot, decision);
    if (!message) {
      entries.push({ ...base, decision, outcome: { status: "failed", error: "لا قالب لهذا النوع" } });
      continue;
    }

    if (dryRun) {
      entries.push({ ...base, decision, outcome: { status: "sent", dryRun: true } });
      continue;
    }

    // ١) الحجز — يفشل بصمت إن سبقه تشغيل آخر في نفس اليوم.
    const { data: claimed, error: claimErr } = await admin
      .from("reminders")
      .insert({
        student_id: snapshot.studentId,
        section_id: decision.sectionId,
        type: decision.type,
        sent_on: day,
        context: decision.reason,
      })
      .select("id")
      .maybeSingle();

    if (claimErr || !claimed) {
      entries.push({
        ...base,
        decision,
        outcome: { status: "skipped", why: "حُجز موضع اليوم في تشغيل آخر" },
      });
      continue;
    }

    // ٢) الإرسال — وتراجعٌ عن الحجز إن فشل، ليُعاد غدًا.
    const result = await sendEmail(message);
    if (!result.ok) {
      await admin.from("reminders").delete().eq("id", claimed.id);
      entries.push({ ...base, decision, outcome: { status: "failed", error: result.error } });
      continue;
    }

    entries.push({ ...base, decision, outcome: { status: "sent", dryRun: result.dryRun } });
  }

  return {
    ranAt: now.toISOString(),
    day,
    dryRun: dryRun || !isEmailConfigured(),
    studentsScanned: snapshots.length,
    sent: entries.filter((e) => e.outcome.status === "sent").length,
    skipped: entries.filter((e) => e.outcome.status === "skipped").length,
    failed: entries.filter((e) => e.outcome.status === "failed").length,
    entries,
  };
}
