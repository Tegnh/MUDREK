import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getExamById, getExamDiagnoses, getClassById, getMisconceptionsCatalog } from "@/lib/data/teacher-queries";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import ReviewTable from "./ReviewTable";

export const metadata: Metadata = { title: "مراجعة التصحيح" };

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: examId } = await params;

  const supabase = await createClient();
  const exam = await getExamById(supabase, examId);
  if (!exam) notFound();

  const [cls, rows, catalog] = await Promise.all([
    getClassById(supabase, exam.class_id),
    getExamDiagnoses(supabase, examId),
    getMisconceptionsCatalog(supabase),
  ]);

  return (
    <div>
      <header className="mb-10">
        {cls && (
          <Link
            href={`/t/class/${cls.id}`}
            className="text-[12.5px] font-medium text-muted hover:text-ink"
          >
            {cls.name}
          </Link>
        )}
        <h1 className="mt-1 text-[30px] font-bold leading-[1.25] tracking-[-0.015em]">{exam.title}</h1>
        <p className="mt-2 max-w-[64ch] text-[14px] leading-relaxed text-muted">
          راجع ما استخرجه مُدرِك من كل ورقة. الصفوف بلون الإشارة تحتاج مراجعتك تحديدًا — عدّلها ثم
          اعتمد النتائج.
        </p>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          tone="gap"
          title="لا نتائج بعد لهذا الاختبار"
          description="ارفع صور أوراق الإجابة أولًا حتى تظهر هنا للمراجعة."
          action={
            <Link href="/t/upload">
              <Button>رفع ورقة اختبار</Button>
            </Link>
          }
        />
      ) : (
        <ReviewTable
          examId={exam.id}
          classId={exam.class_id}
          initialRows={rows.map((r) => ({
            id: r.id,
            studentName: r.studentName,
            questionNo: r.questionNo,
            extractedText: r.extractedText ?? "",
            isCorrect: r.isCorrect,
            misconceptionId: r.misconceptionId,
            confidence: r.confidence,
            teacherApproved: r.teacherApproved,
          }))}
          misconceptions={catalog.map((m) => ({ id: m.id, label: m.label }))}
        />
      )}
    </div>
  );
}
