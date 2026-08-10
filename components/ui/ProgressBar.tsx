import { cn } from "@/lib/cn";

export type ProgressBarProps = {
  /** الجزء المُتقَن، من 0 إلى max. */
  value: number;
  max?: number;
  /**
   * الجزء المعلّم كفجوة، يبدأ حيث ينتهي value. هذا هو الموضع الوحيد الذي
   * يظهر فيه البرتقالي في هذا المكوّن — وهو سبب وجوده.
   */
  gap?: number;
  label?: string;
  /** سطر توضيحي أسفل الشريط. */
  caption?: string;
  showValue?: boolean;
  size?: "sm" | "md";
  className?: string;
};

const heights = { sm: "h-1.5", md: "h-2.5" } as const;

export function ProgressBar({
  value,
  max = 100,
  gap = 0,
  label,
  caption,
  showValue = true,
  size = "md",
  className,
}: ProgressBarProps) {
  const safeMax = max > 0 ? max : 100;
  const filled = Math.min(Math.max(value, 0), safeMax);
  const flagged = Math.min(Math.max(gap, 0), safeMax - filled);

  const filledPct = (filled / safeMax) * 100;
  const gapPct = (flagged / safeMax) * 100;

  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="mb-2 flex items-baseline justify-between gap-4">
          {label && <span className="text-[13px] font-medium text-ink">{label}</span>}
          {showValue && (
            <span dir="ltr" className="tabular text-[13px] font-medium text-muted">
              {Math.round(filledPct)}%
            </span>
          )}
        </div>
      )}

      <div
        role="progressbar"
        aria-valuenow={filled}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-label={label}
        className={cn(
          "flex w-full overflow-hidden rounded-card bg-ink/[0.08]",
          heights[size],
        )}
      >
        <span className="h-full bg-ink" style={{ width: `${filledPct}%` }} />
        {gapPct > 0 && (
          <span className="h-full bg-accent" style={{ width: `${gapPct}%` }} />
        )}
      </div>

      {(caption || gapPct > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          {gapPct > 0 && (
            <span className="inline-flex items-center gap-2 text-[12.5px] text-ink">
              <span
                aria-hidden="true"
                className="h-[3px] w-4 shrink-0 rounded-card bg-accent"
              />
              فجوة{" "}
              <span dir="ltr" className="tabular">
                {Math.round(gapPct)}%
              </span>
            </span>
          )}
          {caption && <span className="text-[12.5px] text-muted">{caption}</span>}
        </div>
      )}
    </div>
  );
}

export default ProgressBar;
