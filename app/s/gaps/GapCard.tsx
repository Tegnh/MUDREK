"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import type { GapItem } from "@/lib/data/store";
import type { GenerateRemedialOutput } from "@/lib/ai/schemas";
import { IconBridge } from "@/components/student/icons";
import { startRemedialAction } from "./actions";
import { RemedialRunner } from "./RemedialRunner";

export function GapCard({ gap }: { gap: GapItem }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<GenerateRemedialOutput | null>(null);
  const [pending, startTransition] = useTransition();

  function begin() {
    if (!gap.primaryMisconceptionId) return;
    setOpen(true);
    if (!data) {
      const misconceptionId = gap.primaryMisconceptionId;
      startTransition(async () => {
        const result = await startRemedialAction(misconceptionId);
        setData(result);
      });
    }
  }

  return (
    <Card flagged padding="lg" className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-card bg-accent-wash text-ink">
          <IconBridge className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] text-muted">معلّمك رصد ضعفًا في</p>
          <p className="text-[18px] font-bold leading-snug">{gap.concept}</p>
        </div>
      </div>

      {gap.note && (
        <p className="border-e-2 border-line-strong pe-3 text-[13px] leading-relaxed text-muted">{gap.note}</p>
      )}

      {gap.questionCount > 0 ? (
        <>
          <p className="text-[14px] leading-relaxed">
            وجدنا <span className="tabular font-bold text-ink">{gap.questionCount}</span> أسئلة في ملفاتك تخص
            هذا المفهوم
            {gap.wrongAttemptsCount > 0 && (
              <>
                ، وأخطأت في <span className="tabular font-bold text-ink">{gap.wrongAttemptsCount}</span> منها
                فعلًا
              </>
            )}
            .
          </p>

          <div className="flex flex-wrap gap-2">
            {gap.matchingSections.map((s) => (
              // ارتفاع 44px مساحة لمس، والشارة نفسها تبقى بحجمها البصري
              <Link
                key={s.sectionId}
                href={`/s/course/${s.fileId}`}
                className="inline-flex min-h-11 items-center"
              >
                <Badge>
                  {s.fileTitle} · {s.sectionTitle}
                </Badge>
              </Link>
            ))}
          </div>

          {!open ? (
            <Button fullWidth onClick={begin} disabled={!gap.primaryMisconceptionId}>
              ابدأ التمرين الموجّه — 3 دقائق
            </Button>
          ) : (
            <RemedialRunner data={data} loading={pending && !data} />
          )}
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-[14px] leading-relaxed text-muted">
            لم نجد بعد أسئلة في ملفاتك تخص هذا المفهوم.
          </p>
          <Link href="/s/upload" className="block">
            <Button variant="ghost" fullWidth>
              ارفع مصدرًا يغطّي هذا المفهوم
            </Button>
          </Link>
        </div>
      )}
    </Card>
  );
}

export default GapCard;
