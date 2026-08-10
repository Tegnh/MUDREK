import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

/**
 * لا يوجد لمعان يمرّ ولا تدرّج. الانتظار هنا نبضة عتامة واحدة على الحبر —
 * أقرب إلى حبر لم يجفّ بعد منه إلى شاشة تحميل.
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("h-4 w-full rounded-card bg-ink/[0.09] animate-breathe", className)}
      {...props}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className,
  ...props
}: SkeletonProps & { lines?: number }) {
  return (
    <div className={cn("space-y-2.5", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3.5", i === lines - 1 && lines > 1 && "w-2/3")}
        />
      ))}
    </div>
  );
}

/**
 * هيكل بإيقاع العلامة نفسه: سطر طويل، ثم سطر مقطوع بفجوة، ثم سطر طويل.
 * يجعل حالة الانتظار تنتمي للهوية بدل أن تكون رمادية محايدة.
 */
export function SkeletonBars({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn("w-full max-w-[240px] space-y-2.5", className)} {...props}>
      <Skeleton className="h-3" />
      <div className="flex gap-2">
        <Skeleton className="h-3 w-[29%]" style={{ animationDelay: "160ms" }} />
        <Skeleton className="h-3 w-[58%]" style={{ animationDelay: "320ms" }} />
      </div>
      <Skeleton className="h-3" style={{ animationDelay: "480ms" }} />
    </div>
  );
}

export default Skeleton;
