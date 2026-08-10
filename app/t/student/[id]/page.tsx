import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  getStudentProfile,
  getStudentDiagnoses,
  getStudentAttempts,
  type StudentDiagnosisRow,
} from "@/lib/data/teacher-queries";
import { computeStudentWeaknesses, RECURRING_THRESHOLD } from "@/lib/data/teacher";
import { cn } from "@/lib/cn";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { IconBack } from "@/components/student/icons";

/* ==========================================================================
   تقرير طالب واحد، من زاوية معلّمه.
   الصفحة كلها مبنية على فكرة واحدة: الفجوة التي رصدها المعلم في ورقة اختبار
   والفجوة التي كشفها الطالب على نفسه في مذاكرته الذاتية هما الشيء نفسه حين
   يحملان نفس misconception_id — والجدول الأول أدناه هو موضع التقائهما.
   ========================================================================== */

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await getStudentProfile(supabase, id);
  return { title: profile?.name ?? "تقرير طالب" };
}

const dateFmt = new Intl.DateTimeFormat("ar-SA-u-nu-latn", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatDate(iso: string) {
  if (!iso) return "—";
  return dateFmt.format(new Date(iso));
}

/** يجمع التشخيصات في مجموعات، مجموعة لكل اختبار، بالترتيب الزمني العكسي. */
function groupByExam(rows: StudentDiagnosisRow[]) {
  const groups = new Map<
    string,
    { examId: string; examTitle: string; createdAt: string; rows: StudentDiagnosisRow[] }
  >();
  for (const row of rows) {
    const key = row.examId || "—";
    if (!groups.has(key)) {
      groups.set(key, {
        examId: row.examId,
        examTitle: row.examTitle || "اختبار غير معنون",
        createdAt: row.examCreatedAt,
        rows: [],
      });
    }
    groups.get(key)!.rows.push(row);
  }
  return Array.from(groups.values());
}

export default async function StudentReportPage({ params }: { params: Params }) {
  const { id: studentId } = await params;

  const supabase = await createClient();
  const profile = await getStudentProfile(supabase, studentId);
  if (!profile) notFound();

  const [diagnoses, attempts] = await Promise.all([
    getStudentDiagnoses(supabase, studentId),
    getStudentAttempts(supabase, studentId),
  ]);

  const weaknesses = computeStudentWeaknesses(diagnoses, attempts);
  const recurringCount = weaknesses.filter((w) => w.recurring).length;
  const examGroups = groupByExam(diagnoses);
  const primaryClass = profile.classes[0];

  return (
    <div className="space-y-12">
      {/* ---------- ترويسة ---------- */}
      <header>
        {primaryClass && (
          <Link
            href={`/t/class/${primaryClass.id}`}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted transition-colors hover:text-ink"
          >
            <IconBack className="size-3.5" />
            {primaryClass.name}
          </Link>
        )}

        <h1 className="mt-2 text-[30px] font-bold leading-[1.25] tracking-[-0.015em]">
          {profile.name}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted">
          <span dir="ltr" className="inline-block">
            {profile.email}
          </span>
          {profile.classes.map((c) => (
            <span key={c.id}>
              {c.name} · {c.subject}
            </span>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <Badge>
            <span dir="ltr" className="tabular">
              {examGroups.length}
            </span>
            &nbsp;اختبارًا مُشخَّصًا
          </Badge>
          <Badge>
            <span dir="ltr" className="tabular">
              {attempts.length}
            </span>
            &nbsp;محاولة ذاتية
          </Badge>
          {recurringCount > 0 && (
            <Badge variant="gap">
              <span dir="ltr" className="tabular">
                {recurringCount}
              </span>
              &nbsp;ضعف متكرّر
            </Badge>
          )}
        </div>
      </header>

      {/* ---------- نقاط الضعف المتكررة ---------- */}
      <section>
        <h2 className="label-eyebrow mb-4">نقاط الضعف</h2>

        {weaknesses.length === 0 ? (
          <EmptyState
            tone="gap"
            title="لا نقاط ضعف مرصودة"
            description="لم يُرصد لهذا الطالب أي مفهوم مغلوط بعد — لا في أوراق اختباره ولا في محاولاته الذاتية."
          />
        ) : (
          <Card padding="none" className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-[13.5px]">
              <caption className="sr-only">
                المفاهيم المغلوطة عند الطالب، وعدد مرات ظهورها في كل مسار
              </caption>
              <thead>
                <tr className="border-b border-line bg-surface/70">
                  <th scope="col" className="px-4 py-3 text-start text-[12px] font-bold text-muted">
                    المفهوم المغلوط
                  </th>
                  <th scope="col" className="px-4 py-3 text-start text-[12px] font-bold text-muted">
                    من تشخيص المعلم
                  </th>
                  <th scope="col" className="px-4 py-3 text-start text-[12px] font-bold text-muted">
                    من محاولاته الذاتية
                  </th>
                  <th scope="col" className="px-4 py-3 text-start text-[12px] font-bold text-muted">
                    المجموع
                  </th>
                </tr>
              </thead>
              <tbody>
                {weaknesses.map((w) => (
                  <tr
                    key={w.misconceptionId}
                    className={cn(
                      "border-b border-line/70 last:border-0",
                      w.recurring && "bg-accent-wash",
                    )}
                  >
                    <th scope="row" className="px-4 py-3 text-start font-medium">
                      <span className="flex flex-wrap items-center gap-2">
                        {w.label}
                        {w.recurring && (
                          <Badge variant="gap" size="sm">
                            متكرّر
                          </Badge>
                        )}
                      </span>
                    </th>
                    <td dir="ltr" className="tabular px-4 py-3 text-start text-muted">
                      {w.fromDiagnoses || "—"}
                    </td>
                    <td dir="ltr" className="tabular px-4 py-3 text-start text-muted">
                      {w.fromAttempts || "—"}
                    </td>
                    <td dir="ltr" className="tabular px-4 py-3 text-start font-bold">
                      {w.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
          يُعلَّم المفهوم كمتكرّر حين يظهر{" "}
          <span dir="ltr" className="tabular">
            {RECURRING_THRESHOLD}
          </span>{" "}
          مرّات فأكثر، سواء تكرّر في ورقة اختبار أم امتدّ من ورقة الاختبار إلى مذاكرة الطالب
          لنفسه.
        </p>
      </section>

      {/* ---------- السجل الزمني للتشخيصات ---------- */}
      <section>
        <h2 className="label-eyebrow mb-4">سجل التشخيصات</h2>

        {examGroups.length === 0 ? (
          <EmptyState
            title="لا أوراق مُشخَّصة بعد"
            description="حين ترفع ورقة إجابة لهذا الطالب وتصحَّح، سيظهر تشخيصها هنا."
          />
        ) : (
          <div className="space-y-4">
            {examGroups.map((group) => {
              const wrong = group.rows.filter((r) => !r.isCorrect).length;
              return (
                <Card key={group.examId || group.examTitle} padding="none">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5 border-b border-line px-5 py-4">
                    <div className="min-w-0">
                      <Link
                        href={`/t/review/${group.examId}`}
                        className="text-[15px] font-bold tracking-[-0.01em] transition-colors hover:text-muted"
                      >
                        {group.examTitle}
                      </Link>
                      <p className="mt-0.5 text-[12.5px] text-muted">{formatDate(group.createdAt)}</p>
                    </div>
                    <p className="text-[12.5px] text-muted">
                      <span dir="ltr" className="tabular">
                        {group.rows.length - wrong}
                      </span>{" "}
                      صحيحة من{" "}
                      <span dir="ltr" className="tabular">
                        {group.rows.length}
                      </span>
                    </p>
                  </div>

                  <ul className="divide-y divide-line/70">
                    {group.rows.map((row) => (
                      <li
                        key={row.id}
                        className="flex flex-wrap items-start gap-x-4 gap-y-2 px-5 py-3.5"
                      >
                        <span
                          dir="ltr"
                          className="tabular w-8 shrink-0 text-start text-[12.5px] text-muted"
                        >
                          {row.questionNo}
                        </span>

                        <span className="min-w-0 flex-1 text-[13.5px] leading-relaxed">
                          {row.extractedText || (
                            <span className="text-muted">لا نصّ مستخرج</span>
                          )}
                        </span>

                        {row.isCorrect ? (
                          <Badge size="sm">صحيحة</Badge>
                        ) : row.misconceptionLabel ? (
                          <Badge variant="gap" size="sm">
                            {row.misconceptionLabel}
                          </Badge>
                        ) : (
                          <Badge variant="danger" size="sm">
                            خاطئة — بلا مفهوم
                          </Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------- المحاولات الذاتية ---------- */}
      <section>
        <h2 className="label-eyebrow mb-4">محاولاته الذاتية</h2>

        {attempts.length === 0 ? (
          <EmptyState
            title="لم يبدأ مذاكرة ذاتية بعد"
            description="حين يرفع الطالب مصادره الدراسية ويختبر نفسه، ستظهر نتائج محاولاته هنا — دون محتوى مصادره الخاصة."
          />
        ) : (
          <>
            <Card padding="none" className="overflow-x-auto">
              <table className="w-full min-w-[460px] border-collapse text-[13.5px]">
                <thead>
                  <tr className="border-b border-line bg-surface/70">
                    <th scope="col" className="px-4 py-3 text-start text-[12px] font-bold text-muted">
                      التاريخ
                    </th>
                    <th scope="col" className="px-4 py-3 text-start text-[12px] font-bold text-muted">
                      الدرجة
                    </th>
                    <th scope="col" className="px-4 py-3 text-start text-[12px] font-bold text-muted">
                      المفهوم المغلوط
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a) => (
                    <tr key={a.id} className="border-b border-line/70 last:border-0">
                      <td className="px-4 py-3 text-muted">{formatDate(a.createdAt)}</td>
                      <td dir="ltr" className="tabular px-4 py-3 text-start font-medium">
                        {a.score}%
                      </td>
                      <td className="px-4 py-3">
                        {a.misconceptionLabel ? (
                          <Badge variant="gap" size="sm">
                            {a.misconceptionLabel}
                          </Badge>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
              تُعرَض النتيجة والمفهوم المغلوط فقط. مصادر الطالب الدراسية وأقسامها تبقى خاصة به
              ولا تظهر للمعلم.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
