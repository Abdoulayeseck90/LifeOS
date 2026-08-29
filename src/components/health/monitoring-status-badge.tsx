import { useTranslations } from "next-intl";
import type { MonitoringItem } from "@/types/health/entities";
import { getMonitoringItemDisplayStatus } from "@/services/health/monitoring";

// Maps the computed display status (see monitoring.ts —
// upcoming/due_soon/due/overdue are computed, not stored) to the
// semantic status colors in tailwind.config.ts. Never a raw hex value.
const STATUS_CLASSES: Record<string, string> = {
  overdue: "bg-status-urgent/10 text-status-urgent",
  due: "bg-status-attention/10 text-status-attention",
  due_soon: "bg-status-attention/10 text-status-attention",
  upcoming: "bg-status-normal/10 text-status-normal",
  completed: "bg-status-normal/10 text-status-normal",
  cancelled: "bg-status-inactive/10 text-status-inactive",
  deferred: "bg-status-inactive/10 text-status-inactive",
};

export function MonitoringStatusBadge({ item }: { item: Pick<MonitoringItem, "status" | "next_due_at"> }) {
  const t = useTranslations("monitoring.status");
  const displayStatus = getMonitoringItemDisplayStatus(item);

  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[displayStatus]}`}>
      {t(displayStatus)}
    </span>
  );
}

// Addendum Section 6/9: clinician-defined schedules take visual priority
// over generic guideline suggestions — clinician gets the brand-accent
// treatment, guideline/user stay neutral.
export function MonitoringSourceBadge({ source }: { source: MonitoringItem["source"] }) {
  const t = useTranslations("monitoring.source");
  const className =
    source === "clinician" ? "bg-primary/10 text-primary" : "bg-surface text-muted";

  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${className}`}>{t(source)}</span>;
}
