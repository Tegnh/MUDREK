import Link from "next/link";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import type { Heatmap as HeatmapData } from "@/lib/data/teacher";

function cellClass(count: number) {
  if (count <= 0) return "bg-transparent text-muted/35";
  if (count === 1) return "bg-accent-wash text-ink";
  if (count === 2) return "bg-accent/55 text-ink";
  return "bg-accent text-ink";
}

export default function Heatmap({ data }: { data: HeatmapData }) {
  if (data.roster.length === 0) {
    return (
      <EmptyState
        title="لا طلاب في هذا الفصل بعد"
        description="خريطة الفجوات ستظهر حين ينضمّ طلاب إلى هذا الفصل."
      />
    );
  }

  if (data.outcomes.length === 0) {
    return (
      <EmptyState
        tone="gap"
        title="لا فجوات مرصودة بعد"
        description="ارفع ورقة اختبار وصحّحها حتى تظهر خريطة الفجوات هنا."
      />
    );
  }

  return (
    <Card padding="none" className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-line bg-surface/70">
            <th className="sticky start-0 z-10 bg-surface/70 px-4 py-3 text-start text-[12px] font-bold text-muted">
              الطالب
            </th>
            {data.outcomes.map((outcome) => (
              <th
                key={outcome}
                className="min-w-[132px] max-w-[160px] px-3 py-3 text-start text-[11.5px] font-bold leading-snug text-muted"
                title={outcome}
              >
                <span className="line-clamp-2">{outcome}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.roster.map((student) => (
            <tr key={student.id} className="border-b border-line/70 last:border-0">
              <td className="sticky start-0 z-10 bg-paper px-4 py-2.5 font-medium">
                {/* اسم الطالب هو مدخل تقريره الفردي — الصف كله يقود إليه */}
                <Link
                  href={`/t/student/${student.id}`}
                  className="underline-offset-4 transition-colors hover:text-muted hover:underline"
                >
                  {student.name}
                </Link>
              </td>
              {data.outcomes.map((outcome) => {
                const count = data.matrix[student.id]?.[outcome] ?? 0;
                return (
                  <td key={outcome} className="p-1.5">
                    <div
                      className={cn(
                        "flex h-9 items-center justify-center rounded-card text-[12.5px] font-medium tabular",
                        cellClass(count),
                      )}
                    >
                      {count > 0 ? count : "—"}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
