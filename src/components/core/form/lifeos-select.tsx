import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { LIFEOS_INPUT_BASE, inputStateClasses } from "@/components/core/form/lifeos-input";

// Form Redesign spec, Section 10: "select fields must look clearly
// different from normal text... do not make the dropdown arrow tiny or
// difficult to see" — appearance-none on the native <select> plus an
// explicit, properly-sized ChevronDown so every browser/OS renders the
// same visible arrow instead of relying on native styling.
export const LifeOSSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }>(
  function LifeOSSelect({ error, className, children, ...props }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={`${LIFEOS_INPUT_BASE} ${inputStateClasses(error)} appearance-none pr-10 ${className ?? ""}`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown size={18} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
      </div>
    );
  }
);
