import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getClassById, getClassRoster, getClassDiagnoses } from "@/lib/data/teacher-queries";
import { computeHeatmap, computeTopMisconceptions } from "@/lib/data/teacher";
import Badge from "@/components/ui/Badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import EmptyState from "@/components/ui/EmptyState";
import Heatmap from "./Heatmap";
import SendRemedialButton from "./SendRemedialButton";

export const metadata: Metadata = { title: "خريطة الفجوات" };

export default async function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: classId } = await params;

  const supabase = await createClient();
  const cls = await getClassById(supabase, classId);
  if (!cls) notFound();

  const [roster, diagnoses] = await Promise.all([
    getClassRoster(supabase, classId),
    getClassDiagnoses(supabase, classId),
  ]);

  const heatmap = computeHeatmap(diagnoses, roster);
  const topMisconceptions = computeTopMisconceptions(diagnoses, roster.length, 3);

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-[30px] font-bold leading-[1.25] tracking-[-0.015em]">{cls.name}</h1>
        <p className="mt-2 text-[14px] text-muted">{cls.subject} · {roster.length} طالبًا</p>
      </header>

      <section>
        <h2 className="label-eyebrow mb-4">خريطة الفجوات</h2>
        <Heatmap data={heatmap} />
      </section>

      <section>
        <h2 className="label-eyebrow mb-4">الطلاب</h2>
        {roster.length === 0 ? (
          <EmptyState
            title="لا طلاب في هذا الفصل بعد"
            description="شارك رمز انضمام الفصل مع طلابك ليظهروا هنا."
          />
        ) : (
          <Card padding="none">
            <ul className="divide-y divide-line/70">
              {roster.map((student) => {
                const gaps = Object.values(heatmap.matrix[student.id] ?? {}).reduce(
                  (sum, n) => sum + n,
                  0,
                );
                return (
                  <li key={student.id}>
                    {/* صف الطالب كاملًا هو الرابط إلى تقريره الفردي */}
                    <Link
                      href={`/t/student/${student.id}`}
                      className="flex min-h-14 items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-ink/[0.03]"
                    >
                      <span className="min-w-0 truncate text-[14px] font-medium">
                        {student.name}
                      </span>
                      {gaps > 0 ? (
                        <Badge variant="gap" size="sm">
                          <span dir="ltr" className="tabular">
                            {gaps}
                          </span>
                          &nbsp;فجوة مرصودة
                        </Badge>
                      ) : (
                        <span className="shrink-0 text-[12.5px] text-muted">لا فجوات مرصودة</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>

      <section>
        <h2 className="label-eyebrow mb-4">أعلى المفاهيم المغلوطة</h2>
        {topMisconceptions.length === 0 ? (
          <EmptyState
            tone="gap"
            title="لا مفاهيم مغلوطة مرصودة بعد"
            description="حين تُصحَّح أوراق كافية، ستظهر هنا أكثر المفاهيم التي يخطئ فيها الفصل."
          />
        ) : (
          <Card padding="lg">
            <div className="space-y-6">
              {topMisconceptions.map((m) => (
                <ProgressBar
                  key={m.misconceptionId}
                  label={m.label}
                  value={0}
                  gap={m.pct}
                  showValue={false}
                  caption={`${m.affected} من ${roster.length || 0} طالبًا`}
                />
              ))}
            </div>
          </Card>
        )}
      </section>

      <section>
        <h2 className="label-eyebrow mb-4">مادة علاجية</h2>
        <Card padding="lg">
          <CardTitle>أرسل مادة علاجية للفصل</CardTitle>
          <CardDescription>
            يُجمَّع الطلاب حسب المفهوم المغلوط المعتمد في المراجعة، ويُولَّد تمرين علاجي مخصّص لكل
            مجموعة، ويصل مباشرة إلى مساحة الطالب.
          </CardDescription>
          <div className="mt-6">
            <SendRemedialButton classId={classId} />
          </div>
        </Card>
      </section>
    </div>
  );
}
