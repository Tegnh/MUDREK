"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { REMINDER_TYPE_LABEL, type SweepEntry, type SweepReport } from "@/lib/reminders/types";
import { runSweepAction } from "./actions";

/**
 * زرّان لا واحد. المعاينة تمرّ بنفس المحرّك وتتوقف قبل الكتابة والإرسال، وهي
 * ما يُشغَّل أمام اللجنة أكثر من مرة: التشغيل الفعلي يحرق موضع اليوم لكل طالب
 * يُرسَل إليه، فلا يُعيد التجربة الثانية شيئًا.
 */
export function RunPanel() {
  const router = useRouter();
  const [report, setReport] = useState<SweepReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"dry" | "live" | null>(null);
  const [pending, startTransition] = useTransition();

  function run(dryRun: boolean) {
    setMode(dryRun ? "dry" : "live");
    startTransition(async () => {
      const state = await runSweepAction(dryRun);
      setError(state.error ?? null);
      setReport(state.report ?? null);
      if (!dryRun) router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2.5">
        <Button onClick={() => run(true)} loading={pending && mode === "dry"} disabled={pending}>
          معاينة بلا إرسال
        </Button>
        <Button
          variant="ghost"
          onClick={() => run(false)}
          loading={pending && mode === "live"}
          disabled={pending}
        >
          شغّل المهمة الآن
        </Button>
      </div>

      {error && (
        <Card padding="sm" className="border-danger/25 bg-danger-wash">
          <p className="text-[13.5px] text-danger">{error}</p>
        </Card>
      )}

      {report && <ReportView report={report} />}
    </div>
  );
}

function ReportView({ report }: { report: SweepReport }) {
  return (
    <Card padding="none">
      <div className="border-b border-line px-6 py-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-[17px] font-bold tracking-[-0.01em]">نتيجة التشغيل</h2>
          {report.dryRun && <Badge size="sm">بلا إرسال فعلي</Badge>}
        </div>
        <p className="mt-1.5 text-[13px] text-muted">
          يوم <span className="tabular">{report.day}</span> بتوقيت الرياض · فُحص{" "}
          <span className="tabular">{report.studentsScanned}</span> طالبًا
        </p>

        <dl className="mt-4 grid grid-cols-3 gap-3">
          <Stat label="أُرسل" value={report.sent} />
          <Stat label="تُخطّي" value={report.skipped} />
          <Stat label="فشل" value={report.failed} />
        </dl>
      </div>

      {report.entries.length === 0 ? (
        <div className="px-6 py-8 text-center text-[13.5px] text-muted">
          لا حسابات طلاب في القاعدة بعد.
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {report.entries.map((entry) => (
            <EntryRow key={entry.studentId} entry={entry} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-line bg-surface px-3.5 py-3">
      <dt className="label-eyebrow">{label}</dt>
      <dd className="tabular mt-1 text-[22px] font-bold leading-none">{value}</dd>
    </div>
  );
}

function EntryRow({ entry }: { entry: SweepEntry }) {
  const { outcome, decision } = entry;

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 px-6 py-4">
      <div className="min-w-0">
        <p className="text-[14.5px] font-medium">{entry.name}</p>
        <p className="mt-0.5 truncate text-[12.5px] text-muted" dir="auto">
          {entry.email}
        </p>

        {decision && (
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{decision.reason}</p>
        )}
        {outcome.status === "skipped" && (
          <p className="mt-1.5 text-[13px] text-muted">{outcome.why}</p>
        )}
        {outcome.status === "failed" && (
          <p className="mt-1.5 text-[13px] text-danger">{outcome.error}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {decision && (
          // البرتقالي للفجوة وحدها — هي القاعدة الوحيدة التي تعلّم نقصًا مقيسًا.
          <Badge size="sm" variant={decision.type === "gap_unresolved" ? "gap" : "neutral"}>
            {REMINDER_TYPE_LABEL[decision.type]}
          </Badge>
        )}
        <OutcomeBadge entry={entry} />
      </div>
    </li>
  );
}

function OutcomeBadge({ entry }: { entry: SweepEntry }) {
  switch (entry.outcome.status) {
    case "sent":
      return <Badge size="sm" variant="solid">{entry.outcome.dryRun ? "كان سيُرسل" : "أُرسل"}</Badge>;
    case "failed":
      return <Badge size="sm" variant="danger">فشل</Badge>;
    default:
      return <Badge size="sm">تُخطّي</Badge>;
  }
}

export default RunPanel;
