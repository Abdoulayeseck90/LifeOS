import { forwardRef, type TextareaHTMLAttributes } from "react";
import { LIFEOS_INPUT_BASE, inputStateClasses } from "@/components/core/form/lifeos-input";

// Form Redesign spec, Section 12: "do not make textareas extremely
// short" — defaults to 3 rows rather than the 2 several forms used
// before.
export const LifeOSTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }>(
  function LifeOSTextarea({ error, className, rows = 3, ...props }, ref) {
    return <textarea ref={ref} rows={rows} className={`${LIFEOS_INPUT_BASE} ${inputStateClasses(error)} resize-y ${className ?? ""}`} {...props} />;
  }
);
