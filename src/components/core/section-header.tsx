import { Link } from "@/lib/i18n/navigation";

// Visual Hierarchy Redesign spec, Section 20: the one shared "section
// title + optional View all link" row, replacing the hand-duplicated
// version of this pattern across the Dashboard, Health Overview, and
// Vitals pages.
export function SectionHeader({ title, action }: { title: string; action?: { label: string; href: string } }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      {action && (
        <Link href={action.href} className="inline-flex min-h-11 items-center text-xs font-medium text-primary hover:underline">
          {action.label}
        </Link>
      )}
    </div>
  );
}
