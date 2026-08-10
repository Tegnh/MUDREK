"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import type { QuizQuestion } from "@/lib/data/types";
import type { AnswerResult } from "@/lib/data/store";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Markdown } from "@/components/student/Markdown";
import { IconBack, IconCheck } from "@/components/student/icons";
import { markSectionOpenedAction, submitAnswerAction } from "../actions";

type Phase = "content" | "quiz" | "result";

type Answered = { selectedIndex: number; result: AnswerResult };

export type LessonRunnerProps = {
  fileId: string;
  fileTitle: string;
  sectionId: string;
  sectionTitle: string;
  contentMd: string;
  quiz: QuizQuestion[];
  nextSection: { id: string; title: string } | null;
};

export function LessonRunner({
  fileId,
  fileTitle,
  sectionId,
  sectionTitle,
  contentMd,
  quiz,
  nextSection,
}: LessonRunnerProps) {
  const router = useRouter();
  const total = quiz.length;

  const [phase, setPhase] = useState<Phase>("content");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<Answered | null>>(() => Array(total).fill(null));
  const [finalResult, setFinalResult] = useState<AnswerResult | null>(null);
  const [pending, startTransition] = useTransition();

  const current = quiz[qIndex];
  const currentAnswer = answers[qIndex];

  // «فتح القسم» يُسجَّل هنا لا في page.tsx: عرض الخادم قد يقع على prefetch لم
  // يره الطالب. تكراره بلا ضرر — القاعدة الأولى تسأل عن وجود الحدث لا عدده.
  useEffect(() => {
    void markSectionOpenedAction(fileId, sectionId, sectionTitle);
  }, [fileId, sectionId, sectionTitle]);

  function startQuiz() {
    setAnswers(Array(total).fill(null));
    setQIndex(0);
    setFinalResult(null);
    setPhase("quiz");
  }

  function selectOption(optionIndex: number) {
    if (currentAnswer || pending) return;
    startTransition(async () => {
      const result = await submitAnswerAction(fileId, sectionId, qIndex, optionIndex);
      setAnswers((prev) => {
        const next = [...prev];
        next[qIndex] = { selectedIndex: optionIndex, result };
        return next;
      });
      if (result.sessionCompleted) setFinalResult(result);
    });
  }

  function goNext() {
    if (qIndex + 1 < total) {
      setQIndex((i) => i + 1);
    } else {
      setPhase("result");
      router.refresh();
    }
  }

  if (phase === "content") {
    return (
      <div className="space-y-7">
        <BackLink fileId={fileId} fileTitle={fileTitle} />
        <SectionHeader sectionTitle={sectionTitle} badge="محتوى القسم" />
        <Card padding="lg">
          <Markdown content={contentMd} />
        </Card>
        <div className="space-y-2">
          <Button fullWidth size="lg" onClick={startQuiz}>
            ابدأ الاختبار ({total} أسئلة)
          </Button>
          <p className="text-center text-[12.5px] text-muted">يستغرق هذا الاختبار نحو ٣ دقائق.</p>
        </div>
      </div>
    );
  }

  if (phase === "quiz") {
    const progressPct = ((qIndex + (currentAnswer ? 1 : 0)) / total) * 100;

    return (
      <div className="space-y-6">
        <BackLink fileId={fileId} fileTitle={fileTitle} />

        <div>
          <div className="mb-2 flex items-center justify-between text-[12.5px] text-muted">
            <span>
              سؤال {qIndex + 1} من {total}
            </span>
            {currentAnswer && (
              <span className="tabular font-medium text-ink">{currentAnswer.result.scorePctAfter}%</span>
            )}
          </div>
          <ProgressBar value={progressPct} showValue={false} size="sm" />
        </div>

        <Card padding="lg" className="space-y-5">
          <p className="text-[17px] font-bold leading-snug">{current.text}</p>

          <div className="space-y-2.5">
            {current.options.map((opt, i) => {
              const answered = !!currentAnswer;
              const isSelected = currentAnswer?.selectedIndex === i;
              const isCorrectOpt = i === current.correct_index;

              let stateClass = "border-line-strong hover:border-ink/30";
              if (answered) {
                if (isCorrectOpt) stateClass = "border-ink bg-ink/[0.045]";
                else if (isSelected) stateClass = "border-danger bg-danger-wash";
                else stateClass = "border-line opacity-55";
              }

              return (
                <button
                  key={i}
                  type="button"
                  disabled={answered || pending}
                  onClick={() => selectOption(i)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-card border px-4 py-3.5 text-start text-[14.5px] leading-snug transition-colors disabled:cursor-not-allowed",
                    stateClass,
                  )}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-current text-[11px] font-bold">
                    {answered && isCorrectOpt ? <IconCheck className="size-3" /> : String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>

          {currentAnswer && (
            <div
              className={cn(
                "rounded-card border px-4 py-3.5 text-[13.5px] leading-relaxed",
                currentAnswer.result.isCorrect
                  ? "border-line bg-surface text-ink"
                  : "border-accent/40 bg-accent-wash/50 text-ink",
              )}
            >
              {currentAnswer.result.isCorrect ? (
                <p className="font-medium">إجابة صحيحة.</p>
              ) : (
                <>
                  <p className="font-medium">ليست هذه الإجابة الصحيحة.</p>
                  {currentAnswer.result.misconceptionDescription && (
                    <p className="mt-1.5 text-muted">{currentAnswer.result.misconceptionDescription}</p>
                  )}
                </>
              )}
            </div>
          )}
        </Card>

        {currentAnswer && (
          <Button fullWidth size="lg" onClick={goNext}>
            {qIndex + 1 < total ? "السؤال التالي" : "عرض النتيجة"}
          </Button>
        )}
      </div>
    );
  }

  /* phase === "result" */
  const mastered = finalResult?.mastered ?? false;
  const scorePct = finalResult?.scorePctAfter ?? 0;

  return (
    <div className="space-y-7">
      <BackLink fileId={fileId} fileTitle={fileTitle} />
      <SectionHeader sectionTitle={sectionTitle} badge="النتيجة" />

      <Card padding="lg" className="space-y-5">
        <div className="text-center">
          <p className="tabular text-[44px] font-bold leading-none">{scorePct}%</p>
          <p className="mt-2.5 text-[14px] font-medium text-muted">
            {mastered ? "أتقنت هذا القسم." : "قيد التقدّم — أعد المحاولة لرفع نسبتك."}
          </p>
        </div>
        <ProgressBar value={scorePct} gap={mastered ? 0 : 100 - scorePct} showValue={false} />
        {finalResult?.streakBumped && (
          <p className="text-center text-[12.5px] text-ink">
            امتدّ عدّاد الالتزام إلى{" "}
            <span className="tabular font-medium">{finalResult.streak.current}</span> يوم متتالٍ.
          </p>
        )}
      </Card>

      <div className="space-y-2.5">
        {mastered ? (
          nextSection ? (
            <Link href={`/s/lesson/${nextSection.id}`}>
              <Button fullWidth size="lg">
                التالي: {nextSection.title}
              </Button>
            </Link>
          ) : (
            <Link href={`/s/course/${fileId}`}>
              <Button fullWidth size="lg">
                العودة إلى الملف
              </Button>
            </Link>
          )
        ) : (
          <Button fullWidth size="lg" onClick={startQuiz}>
            أعد الاختبار
          </Button>
        )}
        <Link href={`/s/course/${fileId}`}>
          <Button fullWidth variant="ghost">
            العودة إلى الملف
          </Button>
        </Link>
      </div>
    </div>
  );
}

function BackLink({ fileId, fileTitle }: { fileId: string; fileTitle: string }) {
  return (
    <Link
      href={`/s/course/${fileId}`}
      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-ink"
    >
      <IconBack className="size-3.5" />
      {fileTitle}
    </Link>
  );
}

function SectionHeader({ sectionTitle, badge }: { sectionTitle: string; badge: string }) {
  return (
    <div>
      <Badge size="sm">{badge}</Badge>
      <h1 className="mt-2.5 text-[24px] font-bold leading-[1.25] tracking-[-0.015em] sm:text-[28px]">
        {sectionTitle}
      </h1>
    </div>
  );
}

export default LessonRunner;
