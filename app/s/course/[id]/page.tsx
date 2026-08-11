import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fileCompletionPct, getFileRaw, sectionsWithStatus } from "@/lib/data/store";
import { warmSectionQuiz } from "@/lib/data/quiz-provider";
import { MASTERY_THRESHOLD } from "@/lib/data/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SectionStatusBadge } from "@/components/student/SectionStatusBadge";
import { IconBack } from "@/components/student/icons";

type Params = Promise<{ id: string }>;
type Search = Promise<{ fallback?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const file = getFileRaw(id);
  return { title: file?.title ?? "الملف" };
}

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { id } = await params;
  const { fallback } = await searchParams;

  const file = getFileRaw(id);
  if (!file) notFound();

  const sections = sectionsWithStatus(id);
  const completion = fileCompletionPct(id);
  const masteredCount = sections.filter((s) => s.status === "mastered").length;

  // القسم الذي سيضغطه الطالب بعد قليل هو أوّل قسم متاح. توليد اختباره يبدأ
  // الآن — وهو يقرأ قائمة الأقسام — بدل أن يبدأ بعد الضغطة فينتظره.
  const upNext = sections.find((s) => s.status === "available" || s.status === "in_progress");
  if (upNext) warmSectionQuiz(upNext.id);

  return (
    <div className="space-y-7">
      <Link
        href="/s"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-ink"
      >
        <IconBack className="size-3.5" />
        لوحتي
      </Link>

      {fallback === "1" && (
        <Card flagged padding="sm">
          <p className="text-[12.5px] leading-relaxed text-ink">
            تعذّر الوصول إلى الذكاء الاصطناعي وقت الرفع، فاستُخدم تقسيم مبدئي مؤقّت بدل التقسيم الدقيق.
            يمكنك إعادة رفع الملف لاحقًا لتحسين الدقة.
          </p>
        </Card>
      )}

      <div>
        <Badge size="sm">{file.subject}</Badge>
        <h1 className="mt-2.5 text-[26px] font-bold leading-[1.2] tracking-[-0.02em] sm:text-[30px]">
          {file.title}
        </h1>
      </div>

      <ProgressBar
        label="نسبة الإتمام"
        value={completion}
        caption={`${masteredCount} من ${sections.length} أقسام مُتقَنة`}
      />

      <div className="space-y-3">
        {sections.map((section, i) => {
          const locked = section.status === "locked";

          const row = (
            <Card
              padding="md"
              className={locked ? "opacity-55" : "transition-shadow hover:shadow-lift"}
            >
              <div className="flex items-center gap-4">
                <span className="tabular flex size-8 shrink-0 items-center justify-center rounded-card border border-line-strong text-[13px] font-bold text-muted">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold">{section.title}</p>
                  {locked ? (
                    <p className="mt-0.5 text-[12.5px] text-muted">
                      أكمل {MASTERY_THRESHOLD}% من القسم السابق لفتحه
                    </p>
                  ) : (
                    section.totalQuestions > 0 && (
                      <p className="tabular mt-0.5 text-[12.5px] text-muted">
                        {section.answeredCount > 0
                          ? `${section.scorePct}% · ${section.answeredCount} من ${section.totalQuestions} أسئلة`
                          : `${section.totalQuestions} أسئلة`}
                      </p>
                    )
                  )}
                </div>
                <SectionStatusBadge status={section.status} size="sm" />
              </div>
            </Card>
          );

          return locked ? (
            <div key={section.id} aria-disabled="true">
              {row}
            </div>
          ) : (
            <Link key={section.id} href={`/s/lesson/${section.id}`} className="block">
              {row}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
