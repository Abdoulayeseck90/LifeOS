import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@/lib/i18n/navigation";
import { CategoryIcon, type IconCategory } from "@/components/core/category-icon";
import { StatusBadge, type StatusTone } from "@/components/core/status-badge";

// Visual Hierarchy Redesign spec, Section 1/20: the Dashboard-style
// summary card — icon container, label, one large headline value, an
// optional status badge, optional muted meta line (date/caption), and
// an optional "View X →" action. This is the <HealthMetricCard/> named
// in Section 20; InfoCard (see info-card.tsx) is its sibling for the
// simpler "count + one caption line" shape used on the Health Overview
// grid — kept separate rather than forcing every summary card through
// one over-flexible component (Section 17: "do not put every
// individual piece of information inside its own giant card").
export function HealthMetricCard({
  icon,
  category,
  label,
  value,
  unit,
  status,
  meta,
  action,
}: {
  icon: LucideIcon;
  category?: IconCategory;
  label: string;
  value: ReactNode;
  unit?: string;
  status?: { tone: StatusTone; label: string };
  meta?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col rounded-card border border-surface bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <CategoryIcon icon={icon} category={category} size="sm" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      </div>

      <div className="flex flex-wrap items-baseline gap-2">
        <p className="text-2xl font-semibold text-secondary">{value}</p>
        {unit && <span className="text-sm font-normal text-muted">{unit}</span>}
      </div>

      {status && (
        <div className="mt-1.5">
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        </div>
      )}

      {meta && <p className="mt-2 text-xs text-muted">{meta}</p>}

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
