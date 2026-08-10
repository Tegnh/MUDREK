"use client";

import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { fieldShell } from "./Input";

export type SelectOption = { value: string; label: string; disabled?: boolean };

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  /** نص يظهر كخيار أوّل غير قابل للاختيار. */
  placeholder?: string;
};

function Chevron() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3.5 6 L8 10.5 L12.5 6" />
    </svg>
  );
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, options, placeholder, className, id, disabled, defaultValue, ...props },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const hintId = `${selectId}-hint`;
  const errorId = `${selectId}-error`;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className={cn(
            "mb-2 block text-[13px] font-medium",
            disabled ? "text-muted" : "text-ink",
          )}
        >
          {label}
        </label>
      )}

      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          defaultValue={defaultValue ?? (placeholder ? "" : undefined)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            fieldShell,
            "cursor-pointer appearance-none ps-3.5 pe-10",
            error
              ? "border-danger focus:border-danger"
              : "border-line-strong hover:border-ink/25 focus:border-ink",
            className,
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>

        <span
          className={cn(
            "pointer-events-none absolute inset-y-0 end-3.5 flex items-center",
            disabled ? "text-muted/50" : "text-muted",
          )}
        >
          <Chevron />
        </span>
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

export default Select;
