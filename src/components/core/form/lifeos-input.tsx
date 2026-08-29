import { forwardRef, type InputHTMLAttributes } from "react";

// Form Redesign spec, Section 1/2/5/24: one shared visible-border input
// — clear neutral-gray border by default, teal border + subtle ring on
// focus, red border in the error state, muted background when
// disabled. Comfortable py-3 padding lands in the spec's 44-48px
// desktop height range. This is the base every LifeOSSelect/
// LifeOSTextarea/LifeOSSearchInput also builds on.
export const LIFEOS_INPUT_BASE =
  "w-full rounded border bg-white px-3.5 py-3 text-secondary placeholder:text-muted focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:border-surface disabled:bg-surface disabled:text-muted";

export function inputStateClasses(hasError?: boolean): string {
  return hasError
    ? "border-status-urgent focus:border-status-urgent focus:ring-status-urgent/20"
    : "border-slate-300 focus:border-primary focus:ring-primary/20";
}

export const LifeOSInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { error?: boolean }>(
  function LifeOSInput({ error, className, ...props }, ref) {
    return <input ref={ref} className={`${LIFEOS_INPUT_BASE} ${inputStateClasses(error)} ${className ?? ""}`} {...props} />;
  }
);
