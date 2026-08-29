import { forwardRef, type InputHTMLAttributes } from "react";
import { Search } from "lucide-react";
import { LIFEOS_INPUT_BASE, inputStateClasses } from "@/components/core/form/lifeos-input";

// Form Redesign spec, Section 11: search inputs get a visible-but-
// subtle Lucide Search icon.
export const LifeOSSearchInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function LifeOSSearchInput({ className, ...props }, ref) {
    return (
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          ref={ref}
          type="search"
          className={`${LIFEOS_INPUT_BASE} ${inputStateClasses(false)} pl-10 ${className ?? ""}`}
          {...props}
        />
      </div>
    );
  }
);
