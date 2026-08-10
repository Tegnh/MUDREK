"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label?: string;
  hint?: string;
  error?: string;
  /** عنصر يظهر في نهاية الحقل: وحدة قياس، عدّاد، أو أيقونة. */
  suffix?: ReactNode;
};

export const fieldShell =
  "h-11 w-full rounded-card border bg-paper text-[15px] text-ink " +
  "placeholder:text-muted/65 transition-colors duration-150 " +
  "disabled:cursor-not-allowed disabled:border-line disabled:bg-surface disabled:text-muted";

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, suffix, className, id, disabled, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            "mb-2 block text-[13px] font-medium",
            disabled ? "text-muted" : "text-ink",
          )}
        >
          {label}
        </label>
      )}

      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            fieldShell,
            "ps-3.5",
            suffix ? "pe-16" : "pe-3.5",
            error
              ? "border-danger focus:border-danger"
              : "border-line-strong hover:border-ink/25 focus:border-ink",
            className,
          )}
          {...props}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 end-3.5 flex items-center text-[12.5px] text-muted tabular">
            {suffix}
          </span>
        )}
      </div>

      {error ? (
        <p id={errorId} className="mt-2 flex items-start gap-2 text-[12.5px] text-danger">
          <span
            aria-hidden="true"
            className="mt-[7px] h-[2px] w-3 shrink-0 rounded-card bg-danger"
          />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-2 text-[12.5px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export default Input;
