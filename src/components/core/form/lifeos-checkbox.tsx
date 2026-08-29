import type { InputHTMLAttributes, ReactNode } from "react";

// Form Redesign spec, Section 13: clearly visible, checked state in
// the LifeOS primary color, entire label clickable (native
// <label><input/>...</label> nesting gets this for free).
export function LifeOSCheckbox({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={`flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-secondary ${className ?? ""}`}>
      <input type="checkbox" className="h-[18px] w-[18px] shrink-0 accent-primary" {...props} />
      {label}
    </label>
  );
}
