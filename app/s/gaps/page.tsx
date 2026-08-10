import type { Metadata } from "next";
import { getGaps } from "@/lib/data/store";
import { EmptyState } from "@/components/ui/EmptyState";
import { GapCard } from "./GapCard";

export const metadata: Metadata = { title: "الفجوات" };

export default function GapsPage() {
  const gaps = getGaps();

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-[28px] font-bold leading-[1.2] tracking-[-0.02em] sm:text-[32px]">الفجوات</h1>
        <p className="mt-1.5 max-w-[56ch] text-[14px] leading-relaxed text-muted">
          ما رصده معلمك في ورقة اختبارك، موصولًا مباشرة بالأسئلة المطابقة له في ملفاتك أنت.
        </p>
      </div>

      {gaps.length === 0 ? (
        <EmptyState
          title="لا فجوات مرصودة بعد"
          description="لم يشخّص معلمك أي ضعف محدّد بعد. أكمل اختبارات أقسامك بانتظام، وستظهر هنا أي فجوة يرصدها معلمك موصولة بأسئلتك مباشرة."
        />
      ) : (
        <div className="space-y-5">
          {gaps.map((gap) => (
            <GapCard key={gap.diagnosisId} gap={gap} />
          ))}
        </div>
      )}
    </div>
  );
}
