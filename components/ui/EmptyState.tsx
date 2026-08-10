import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { MudrikMark } from "@/components/brand/Logo";

export type EmptyStateProps = {
  title: string;
  description?: string;
  /** زر أو رابط. يُمرَّر جاهزًا من الاستدعاء. */
  action?: ReactNode;
  /** رسم بديل عن العلامة الافتراضية. */
  icon?: ReactNode;
  /**
   * "gap" تعني أنّ الفراغ هنا نتيجة قياس — لا يوجد ما يُعرض لأنّ هناك نقصًا،
   * فتحتفظ العلامة بشريطها البرتقالي. الافتراضي فراغ محايد بلا لون إشارة.
   */
  tone?: "neutral" | "gap";
  className?: string;
};

export function EmptyState({
  title,
  description,
  action,
  icon,
  tone = "neutral",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "paper-ruled flex flex-col items-center rounded-card border border-line bg-paper px-8 py-14 text-center",
        className,
      )}
    >
      <span className="mb-6 inline-flex">
        {icon ?? (
          <MudrikMark
            tone={tone === "gap" ? "ink" : "mono"}
            className={cn("w-11", tone === "neutral" && "text-muted/40")}
          />
        )}
      </span>

      <p className="text-[17px] font-bold tracking-[-0.01em] text-ink">{title}</p>

      {description && (
        <p className="mt-2 max-w-[46ch] text-[14px] leading-relaxed text-muted">
          {description}
        </p>
      )}

      {action && <div className="mt-7">{action}</div>}
    </div>
  );
}

export default EmptyState;
