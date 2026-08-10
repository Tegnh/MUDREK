import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEmailConfigured } from "@/lib/email/send";
import { THRESHOLDS } from "@/lib/reminders/rules";
import { REMINDER_TYPE_LABEL, type ReminderType } from "@/lib/reminders/types";
import { RunPanel } from "./RunPanel";

export const metadata: Metadata = { title: "مهمة التذكيرات" };

// السجلّ يتغيّر مع كل تشغيل، ولا معنى لصفحة تشغيل مخبَّأة.
export const dynamic = "force-dynamic";

const RULES = [
  {
    type: "gap_unresolved" as ReminderType,
    title: "فجوة رصدها المعلم ولم يُحلّ تمرينها",
    detail: `مادة علاجية كتبها المعلم قبل ${THRESHOLDS.gapHours} ساعة ولا محاولة على اختبارها.`,
    note: "الأقوى في الترتيب: خلفها إنسان يتابع، لا مؤقّت.",
  },
  {
    type: "streak_at_risk" as ReminderType,
    title: "انقطاع بعد سلسلة قائمة",
    detail: `لا نشاط منذ ${THRESHOLDS.inactivityHours} ساعة، وسلسلة بلغت ${THRESHOLDS.minStreak} أيام فأكثر.`,
    note: null,
  },
  {
    type: "not_started" as ReminderType,
    title: "ملف رُفع ولم يُفتح",
    detail: `مضى ${THRESHOLDS.notStartedHours} ساعة على الرفع دون فتح أي قسم منه.`,
    note: null,
  },
];

export default async function CronPage() {
  const admin = createAdminClient();

  const { data: recent } = await admin
    .from("reminders")
    .select("id, student_id, type, sent_at, sent_on, context")
    .order("sent_at", { ascending: false })
    .limit(15);

  const studentIds = Array.from(new Set((recent ?? []).map((r) => r.student_id)));
  const { data: students } = studentIds.length
    ? await admin.from("users").select("id, name").in("id", studentIds)
    : { data: [] };
  const nameById = new Map((students ?? []).map((u) => [u.id, u.name]));

  const emailReady = isEmailConfigured();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[28px] font-bold leading-[1.2] tracking-[-0.02em] sm:text-[32px]">
          مهمة التذكيرات
        </h1>
        <p className="mt-1.5 max-w-[62ch] text-[14px] leading-relaxed text-muted">
          تعمل تلقائيًا كل يوم ١٨:٠٠ بتوقيت الرياض. هذه الصفحة تشغّل نفس المحرّك يدويًا — لمعاينة
          ما سيُرسل، أو لعرض الآلية وهي تعمل دون انتظار موعد الجدولة.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="label-eyebrow">القواعد وترتيب أولويتها</h2>
        <Card padding="none">
          <ul className="divide-y divide-line">
            {RULES.map((rule, i) => (
              <li key={rule.type} className="flex gap-4 px-6 py-4">
                <span className="tabular mt-0.5 shrink-0 text-[13px] font-bold text-muted">
                  {i + 1}
                </span>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14.5px] font-medium">{rule.title}</p>
                    <Badge size="sm" variant={rule.type === "gap_unresolved" ? "gap" : "neutral"}>
                      {REMINDER_TYPE_LABEL[rule.type]}
                    </Badge>
                  </div>
                  <p className="text-[13px] leading-relaxed text-muted">{rule.detail}</p>
                  {rule.note && <p className="text-[13px] leading-relaxed text-muted">{rule.note}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <p className="text-[13px] leading-relaxed text-muted">
          رسالة واحدة لكل طالب في اليوم على الأكثر — تفوز الأعلى في الترتيب. ولا يتكرّر النوع
          نفسه لنفس الطالب قبل مرور {THRESHOLDS.cooldownDays} أيام.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="label-eyebrow">حالة الإعداد</h2>
        <Card padding="sm">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge size="sm" variant={emailReady ? "solid" : "neutral"}>
              {emailReady ? "Resend مضبوط" : "بلا RESEND_API_KEY"}
            </Badge>
            <Badge size="sm" variant={process.env.CRON_SECRET ? "solid" : "neutral"}>
              {process.env.CRON_SECRET ? "CRON_SECRET مضبوط" : "بلا CRON_SECRET"}
            </Badge>
          </div>
          {!emailReady && (
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              بلا مفتاح Resend يعمل المحرّك في وضع الجفاف: يقرّر ويُظهر النتيجة في السجلّ دون أن
              يغادر بريد. القرارات المعروضة أدناه هي القرارات الحقيقية نفسها.
            </p>
          )}
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="label-eyebrow">التشغيل</h2>
        <RunPanel />
      </section>

      <section className="space-y-3">
        <h2 className="label-eyebrow">آخر ما سُجّل</h2>
        {(recent ?? []).length === 0 ? (
          <Card padding="sm">
            <p className="text-[13.5px] text-muted">لم يُسجَّل أي تذكير بعد.</p>
          </Card>
        ) : (
          <Card padding="none">
            <ul className="divide-y divide-line">
              {(recent ?? []).map((r) => (
                <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 px-6 py-3.5">
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium">
                      {nameById.get(r.student_id) ?? "طالب"}
                    </p>
                    {r.context && (
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{r.context}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge size="sm" variant={r.type === "gap_unresolved" ? "gap" : "neutral"}>
                      {REMINDER_TYPE_LABEL[r.type]}
                    </Badge>
                    <span className="tabular text-[12.5px] text-muted">{r.sent_on}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
