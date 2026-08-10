"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { SkeletonText } from "@/components/ui/Skeleton";
import type { GenerateRemedialOutput } from "@/lib/ai/schemas";

export function RemedialRunner({
  data,
  loading,
}: {
  data: GenerateRemedialOutput | null;
  loading: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  if (loading || !data) {
    return (
      <div className="rounded-card border border-line bg-surface p-4">
        <SkeletonText lines={3} />
      </div>
    );
  }

  const total = data.questions.length;
  const done = index >= total;

  function next() {
    setShowHint(false);
    setShowAnswer(false);
    setIndex((i) => i + 1);
  }

  if (done) {
    return (
      <div className="rounded-card border border-line bg-surface p-4 text-center">
        <p className="text-[14px] font-medium">أنهيت التمرين الموجّه لهذا المفهوم.</p>
      </div>
    );
  }

  const question = data.questions[index];

  return (
    <div className="space-y-3 rounded-card border border-line bg-surface p-4">
      <p className="text-[12.5px] text-muted">
        سؤال {index + 1} من {total}
      </p>
      <p className="text-[14.5px] font-medium leading-relaxed">{question.text}</p>

      <div className="flex flex-wrap gap-2">
        {!showHint && (
          <Button type="button" variant="ghost" onClick={() => setShowHint(true)}>
            أظهر التلميح
          </Button>
        )}
        {!showAnswer && (
          <Button type="button" variant="ghost" onClick={() => setShowAnswer(true)}>
            أظهر الإجابة النموذجية
          </Button>
        )}
      </div>

      {showHint && (
        <p className="rounded-card border border-line-strong bg-paper px-3.5 py-3 text-[13px] leading-relaxed text-muted">
          {question.hint}
        </p>
      )}
      {showAnswer && (
        <p className="rounded-card border border-ink/15 bg-paper px-3.5 py-3 text-[13px] leading-relaxed">
          {question.model_answer}
        </p>
      )}

      <Button type="button" fullWidth onClick={next}>
        {index + 1 < total ? "السؤال التالي" : "إنهاء التمرين"}
      </Button>
    </div>
  );
}

export default RemedialRunner;
