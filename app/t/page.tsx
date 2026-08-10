import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import {
  getTeacherClasses,
  getClassExams,
  getClassDiagnoses,
  getClassRoster,
} from "@/lib/data/teacher-queries";
import { computeClassSummary } from "@/lib/data/teacher";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { NewClassForm } from "./NewClassForm";

export const metadata: Metadata = { title: "الفصول" };

function relativeDate(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "اليوم";
  if (days === 1) return "أمس";
  return `قبل ${days} يومًا`;
}

export default async function TeacherClassesPage() {
  const profile = await requireRole("teacher");
  const supabase = await createClient();

  const classes = await getTeacherClasses(supabase, profile.id);

  const summaries = await Promise.all(
    classes.map(async (c) => {
      const [roster, exams, diagnoses] = await Promise.all([
        getClassRoster(supabase, c.id),
        getClassExams(supabase, c.id),
        getClassDiagnoses(supabase, c.id),
      ]);
      const summary = computeClassSummary({
        studentsCount: roster.length,
        exams: exams.map((e) => ({ id: e.id, title: e.title, createdAt: e.created_at })),
        diagnoses,
      });
      return { class: c, ...summary };
    }),
  );

  const isEmpty = summaries.length === 0;

  return (
    <div>
      <header className="mb-10 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-bold leading-[1.25] tracking-[-0.015em]">الفصول</h1>
          <p className="mt-2 max-w-[60ch] text-[14px] leading-relaxed text-muted">
            فصولك الدراسية، وحالة كل فصل من آخر اختبار رصده مُدرِك.
          </p>
        </div>
        {!isEmpty && <NewClassForm />}
      </header>

      {isEmpty ? (
        <div className="space-y-6">
          <EmptyState
            title="لا فصول بعد"
            description="افتح فصلك الأول، ثم شارك رمز الانضمام مع طلابك. بعدها يمكنك رفع أوراق الاختبار وتشخيصها."
          />
          <NewClassForm startOpen />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summaries.map(({ class: c, studentsCount, lastExam, weakestConcept }) => (
            <Card key={c.id} className="flex h-full flex-col transition-colors hover:border-ink/25">
              <Link href={`/t/class/${c.id}`} className="flex-1">
                <CardTitle>{c.name}</CardTitle>
                <CardDescription>{c.subject}</CardDescription>

                <dl className="mt-6 space-y-3 border-t border-line pt-5 text-[13px]">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted">عدد الطلاب</dt>
                    <dd dir="ltr" className="tabular font-medium text-ink">
                      {studentsCount}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted">آخر اختبار</dt>
                    <dd className="font-medium text-ink">
                      {lastExam ? (
                        <span>
                          {lastExam.title}{" "}
                          <span className="text-muted">· {relativeDate(lastExam.createdAt)}</span>
                        </span>
                      ) : (
                        <span className="text-muted">لا يوجد بعد</span>
                      )}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="shrink-0 text-muted">أضعف مفهوم حاليًا</dt>
                    <dd>
                      {weakestConcept ? (
                        <Badge variant="gap" size="sm">
                          {weakestConcept}
                        </Badge>
                      ) : (
                        <span className="text-[13px] text-muted">لا توجد بيانات كافية</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </Link>

              {/* رمز الانضمام خارج الرابط: نصّ يُنسخ باليد، لا يقود إلى صفحة. */}
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
                <span className="text-[12.5px] text-muted">رمز الانضمام</span>
                <code
                  dir="ltr"
                  className="tabular select-all rounded-card bg-ink/[0.05] px-2.5 py-1 text-[13px] font-medium tracking-[0.08em] text-ink"
                >
                  {c.join_code}
                </code>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
