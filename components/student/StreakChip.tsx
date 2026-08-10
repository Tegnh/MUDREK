import { cn } from "@/lib/cn";
import { IconStreak } from "./icons";

export type StreakChipProps = {
  current: number;
  size?: "sm" | "md";
  className?: string;
};

/** رقم الأيام بالعربية دائمًا LTR منطقيًا لكنه يُعرض ضمن الشارة بلا اتجاه خاص لأنه رقم مفرد. */
export function StreakChip({ current, size = "md", className }: StreakChipProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-card border border-line-strong bg-paper font-medium text-ink",
        size === "sm" ? "h-7 px-2.5 text-[12.5px]" : "h-9 px-3 text-[13px]",
        className,
      )}
      title={`${current} أيام التزام متتالية`}
    >
      <IconStreak className={cn(current > 0 ? "text-ink" : "text-muted/50")} />
      <span className="tabular">{current}</span>
      <span className="text-muted">{size === "sm" ? "يوم" : "يوم متتالٍ"}</span>
    </div>
  );
}

export default StreakChip;
