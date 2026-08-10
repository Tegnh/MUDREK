import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type CardPadding = "none" | "sm" | "md" | "lg";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  padding?: CardPadding;
  /** الظل الوحيد في النظام. يُستخدم للعناصر المرفوعة فعليًا، لا لكل بطاقة. */
  elevated?: boolean;
  /** يضع شريط الفجوة البرتقالي على الحافة العلوية — البطاقة تعلّم نقص. */
  flagged?: boolean;
};

const paddings: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  padding = "md",
  elevated = false,
  flagged = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-card border border-line bg-paper",
        paddings[padding],
        elevated && "shadow-lift",
        className,
      )}
      {...props}
    >
      {flagged && (
        <span
          aria-hidden="true"
          className="absolute start-0 end-0 top-0 h-[3px] bg-accent"
        />
      )}
      {children}
    </div>
  );
}

/* --- أجزاء التركيب: تُستعمل مع padding="none" ---------------------------- */

export function CardHeader({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("border-b border-line px-6 py-5", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-[17px] font-bold leading-snug tracking-[-0.01em]", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("mt-1 text-[14px] leading-relaxed text-muted", className)} {...props}>
      {children}
    </p>
  );
}

export function CardBody({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-6 py-5", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 border-t border-line bg-surface/70 px-6 py-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
