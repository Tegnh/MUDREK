"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { fieldShell } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { updateDiagnosis, approveAllDiagnoses } from "./actions";

const CONFIDENCE_REVIEW_THRESHOLD = 0.7;

type Row = {
  id: string;
  studentName: string;
  questionNo: number;
  extractedText: string;
  isCorrect: boolean;
  misconceptionId: string | null;
  confidence: number | null;
  teacherApproved: boolean;
};

type Misconception = { id: string; label: string };

const compactField = cn(fieldShell, "h-9 px-2.5 text-[13px]");

export default function ReviewTable({
  examId,
  classId,
  initialRows,
  misconceptions,
}: {
  examId: string;
  classId: string;
  initialRows: Row[];
  misconceptions: Misconception[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [isPending, startTransition] = useTransition();
  const [approving, setApproving] = useState(false);
  const [approveMessage, setApproveMessage] = useState<string | null>(null);

  const needsReview = rows.filter(
    (r) => r.confidence === null || r.confidence < CONFIDENCE_REVIEW_THRESHOLD,
  ).length;
  const allApproved = rows.length > 0 && rows.every((r) => r.teacherApproved);

  function patchRow(id: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function handleTextCommit(id: string, value: string) {
    const row = rows.find((r) => r.id === id);
    if (!row || row.extractedText === value) return;
    patchRow(id, { extractedText: value });
    startTransition(() => {
      void updateDiagnosis(id, { extracted_text: value });
    });
  }

  function handleVerdictChange(id: string, isCorrect: boolean) {
    patchRow(id, { isCorrect, misconceptionId: isCorrect ? null : rows.find((r) => r.id === id)?.misconceptionId ?? null });
    startTransition(() => {
      void updateDiagnosis(id, { is_correct: isCorrect });
    });
  }

  function handleMisconceptionChange(id: string, misconceptionId: string | null) {
    patchRow(id, { misconceptionId });
    startTransition(() => {
      void updateDiagnosis(id, { misconception_id: misconceptionId });
    });
  }

  async function handleApproveAll() {
    setApproving(true);
    setApproveMessage(null);
    const result = await approveAllDiagnoses(examId, classId);
    setApproving(false);
    if (result.ok) {
      setRows((prev) => prev.map((r) => ({ ...r, teacherApproved: true })));
      setApproveMessage(result.count > 0 ? `تم اعتماد ${result.count} صفًا.` : "كل الصفوف معتمدة أصلًا.");
    } else {
      setApproveMessage(result.error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {needsReview > 0 ? (
            <Badge variant="gap">{needsReview} صفوف تحتاج مراجعتك</Badge>
          ) : (
            <Badge variant="solid">كل الصفوف بثقة عالية</Badge>
          )}
          {isPending && <span className="text-[12.5px] text-muted">جارٍ الحفظ…</span>}
        </div>

        <div className="flex items-center gap-3">
          {approveMessage && <span className="text-[12.5px] text-muted">{approveMessage}</span>}
          <Button onClick={handleApproveAll} loading={approving} disabled={allApproved}>
            {allApproved ? "تم اعتماد الكل" : "اعتماد الكل"}
          </Button>
        </div>
      </div>

      <Card padding="none" className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-[13.5px]">
          <thead>
            <tr className="border-b border-line bg-surface/70 text-start">
              {["الطالب", "السؤال", "النص المستخرج", "الحكم", "المفهوم المغلوط", "الثقة"].map((h) => (
                <th key={h} className="px-4 py-3 text-start text-[12px] font-bold text-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const flagged = row.confidence === null || row.confidence < CONFIDENCE_REVIEW_THRESHOLD;
              return (
                <tr
                  key={row.id}
                  className={cn("border-b border-line/70 last:border-0", flagged && "bg-accent-wash")}
                >
                  <td className="px-4 py-3 font-medium">{row.studentName}</td>
                  <td className="px-4 py-3">
                    <span dir="ltr" className="tabular text-muted">
                      {row.questionNo}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      className={cn(compactField, "min-w-[180px] border-line-strong focus:border-ink")}
                      defaultValue={row.extractedText}
                      onBlur={(e) => handleTextCommit(row.id, e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className={cn(compactField, "min-w-[100px] cursor-pointer border-line-strong focus:border-ink")}
                      value={row.isCorrect ? "correct" : "incorrect"}
                      onChange={(e) => handleVerdictChange(row.id, e.target.value === "correct")}
                    >
                      <option value="correct">صحيحة</option>
                      <option value="incorrect">خاطئة</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className={cn(
                        compactField,
                        "min-w-[180px] cursor-pointer border-line-strong focus:border-ink",
                        row.isCorrect && "cursor-not-allowed text-muted",
                      )}
                      value={row.misconceptionId ?? ""}
                      disabled={row.isCorrect}
                      onChange={(e) => handleMisconceptionChange(row.id, e.target.value || null)}
                    >
                      <option value="">—</option>
                      {misconceptions.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span dir="ltr" className="tabular font-medium">
                        {row.confidence === null ? "—" : `${Math.round(row.confidence * 100)}%`}
                      </span>
                      {flagged && <Badge variant="gap" size="sm">يحتاج مراجعتك</Badge>}
                      {row.teacherApproved && !flagged && (
                        <Badge size="sm">معتمد</Badge>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
