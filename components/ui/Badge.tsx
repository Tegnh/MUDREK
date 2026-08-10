import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant = "neutral" | "solid" | "gap" | "danger";
export type BadgeSize = "sm" | "md";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  size?: BadgeSize;
};

const sizes: Record<BadgeSize, string> = {
  sm: "h-[22px] px-2 text-[11px]",
  md: "h-7 px-2.5 text-[12.5px]",
};

const variants: Record<BadgeVariant, string> = {
  neutral: "border-line-strong bg-transparent text-muted",
  solid: "border-ink bg-ink text-surface",
  // الاستخدام المشروع الوحيد للبرتقالي المصمت: هذه الشارة تعني «فجوة».
  // النص حبري لا فاتح — التباين على البرتقالي يتطلّب ذلك.
  gap: "border-accent bg-accent text-ink",
  danger: "border-danger/25 bg-danger-wash text-danger",
};

export function Badge({
  variant = "neutral",
  size = "md",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-card border font-medium leading-none whitespace-nowrap",
        sizes[size],
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge;
