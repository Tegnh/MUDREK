"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { sendRemedialMaterial } from "./actions";

type Result =
  | { ok: true; groupsSent: number; studentsReached: number; labels: string[]; partialFailures: number }
  | { ok: false; error: string };

export default function SendRemedialButton({ classId }: { classId: string }) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function handleSend() {
    setSending(true);
    setResult(null);
    const res = await sendRemedialMaterial(classId);
    setSending(false);
    setResult(res);
  }

  return (
    <div className="space-y-4">
      <Button onClick={handleSend} loading={sending}>
        أرسل مادة علاجية
      </Button>

      {result && (
        <Card flagged={result.ok} padding="md" className={!result.ok ? "border-danger/25" : undefined}>
          {result.ok ? (
            <div>
              <p className="text-[13.5px] font-medium">
                أُرسلت مادة علاجية إلى {result.studentsReached} طالبًا عبر {result.groupsSent} مجموعة.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {result.labels.map((label) => (
                  <Badge key={label} variant="gap" size="sm">
                    {label}
                  </Badge>
                ))}
              </div>
              {result.partialFailures > 0 && (
                <p className="mt-3 text-[12.5px] text-muted">
                  تعذّر توليد المادة لـ {result.partialFailures} مجموعة إضافية — يمكنك إعادة المحاولة.
                </p>
              )}
            </div>
          ) : (
            <p className="text-[13.5px] text-danger">{result.error}</p>
          )}
        </Card>
      )}
    </div>
  );
}
