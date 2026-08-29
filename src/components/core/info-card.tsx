import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@/lib/i18n/navigation";
import { CategoryIcon, type IconCategory } from "@/components/core/category-icon";

// Shared shell for the icon-labeled summary cards used across Dashboard
// and Health Overview (Master Redesign: "create reusable components
// rather than styling each page independently") — each page supplies
// its own main content, this just owns the consistent icon/label header
// and the optional "View X →" action link. The icon renders inside a
// CategoryIcon container (Visual Hierarchy Redesign spec, Section 3)
// rather than bare beside the text; `category` is optional and falls
// back to the neutral tint, so every existing call site keeps working
// unchanged.
export function InfoCard({
  icon: Icon,
  category,
  label,
  action,
  children,
}: {
  icon: LucideIcon;
  category?: IconCategory;
  label: string;
  action?: { label: string; href: string };
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-card border border-surface bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <CategoryIcon icon={Icon} category={category} size="sm" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      </div>
      <div className="flex-1">{children}</div>
      {action && (
        <Link
          href={action.href}
          className="mt-3 inline-flex min-h-11 w-fit items-center text-xs font-medium text-primary hover:underline"
        >
          {action.label} →
        </Link>
      )}
    </div>
  );
}
