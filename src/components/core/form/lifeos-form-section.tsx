import type { ReactNode } from "react";

// Form Redesign spec, Section 7/23: long forms get divided into named
// sections (e.g. "Test Information" / "Reference Information" /
// "Additional Information") instead of one undifferentiated list of
// fields.
export function LifeOSFormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-t border-surface pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold text-secondary">{title}</h3>
      {children}
    </div>
  );
}
