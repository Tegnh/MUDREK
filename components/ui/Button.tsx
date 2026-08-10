"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  /** أيقونة تسبق النص في اتجاه القراءة. */
  icon?: ReactNode;
};

const base =
  "relative inline-flex items-center justify-center gap-2 rounded-card border font-medium " +
  "select-none whitespace-nowrap transition-colors duration-150 ease-out " +
  "active:translate-y-px disabled:pointer-events-none";

/**
 * التعطيل ليس شفافية. تخفيت الحبر إلى 40% يعطي رماديًا مزرقًا يصطدم بالورق
 * الدافئ. بدلًا من ذلك تنسحب الأنماط الثلاثة إلى مظهر واحد: ورق، حدّ رفيع،
 * نصّ خافت. الزر المعطّل لا ينبغي أن يحتفظ بحضور الزر المتاح.
 */
const disabledLook =
  "disabled:border-line disabled:bg-transparent disabled:text-muted/70";

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-[13px]",
  md: "h-11 px-5 text-[14px]",
  lg: "h-[52px] px-7 text-[15px]",
};

const variants: Record<ButtonVariant, string> = {
  // الإجراء الأساسي حبري دائمًا. البرتقالي لا يُستخدم هنا أبدًا.
  primary: "border-ink bg-ink text-surface hover:border-ink-soft hover:bg-ink-soft",
  ghost:
    "border-line-strong bg-transparent text-ink hover:border-ink/30 hover:bg-ink/[0.045]",
  danger:
    "border-danger bg-danger text-surface hover:border-danger-deep hover:bg-danger-deep",
};

/** مؤشّر انتظار من ثلاثة أشرطة — إيقاع العلامة نفسه، لا دوّامة عامة. */
function BarTicks() {
  return (
    <span
      className="absolute inset-0 flex items-center justify-center gap-[3px]"
      aria-hidden="true"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-3.5 w-[2.5px] rounded-card bg-current animate-tick"
          style={{ animationDelay: `${i * 130}ms` }}
        />
      ))}
    </span>
  );
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    fullWidth = false,
    icon,
    className,
    children,
    disabled,
    type = "button",
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        base,
        sizes[size],
        variants[variant],
        // أثناء الانتظار يبقى الزر بكامل مظهره: هو مشغول، لا معطّل.
        !loading && disabledLook,
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading && <BarTicks />}
      <span
        className={cn(
          "inline-flex items-center gap-2",
          loading && "invisible",
        )}
      >
        {icon && <span className="inline-flex shrink-0 [&>svg]:block">{icon}</span>}
        {children}
      </span>
    </button>
  );
});

export default Button;
