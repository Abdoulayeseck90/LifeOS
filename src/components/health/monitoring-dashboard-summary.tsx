import { getTranslations } from "next-intl/server";
import { getMonitoringItemDisplayStatus } from "@/services/health/monitoring";
import type { MonitoringItemWithGuideline } from "@/services/health/monitoring";

// Addendum Section 16: Due Soon / Upcoming / Overdue / Recently
// Completed, grouped from the same monitoring items already loaded by
// the page — no separate query. "Due" and "Due soon" share one section
// (matches the addendum's own dashboard mockup, which doesn't show a
// separate "Due" group). Recently Completed reads last_completed_at on
// each item (the most recent completion only) — full completion history
// per item already lives on the Timeline page; duplicating that here
// would just be noise.
function daysUntil(dateStr: string): number {
  const today = new Date(new Date().toISOString().slice(0, 10));
  const due = new Date(dateStr);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export async function MonitoringDashboardSummary({ items }: { items: MonitoringItemWithGuideline[] }) {
  const t = await getTranslations("monitoring.dashboard");

  const overdue = items.filter((item) => getMonitoringItemDisplayStatus(item) === "overdue");
  const dueSoon = items.filter((item) => {
    const status = getMonitoringItemDisplayStatus(item);
    return status === "due" || status === "due_soon";
  });
  const upcoming = items.filter((item) => getMonitoringItemDisplayStatus(item) === "upcoming");
  const recentlyCompleted = items
    .filter((item) => item.last_completed_at)
    .sort((a, b) => (b.last_completed_at ?? "").localeCompare(a.last_completed_at ?? ""))
    .slice(0, 5);

  const groups = [
    { key: "overdue", label: t("overdue"), entries: overdue, showDue: true },
    { key: "dueSoon", label: t("dueSoon"), entries: dueSoon, showDue: true },
    { key: "upcoming", label: t("upcoming"), entries: upcoming, showDue: true },
    { key: "recentlyCompleted", label: t("recentlyCompleted"), entries: recentlyCompleted, showDue: false },
  ];

  return (
    <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
      {groups.map((group) => (
        <div key={group.key} className="rounded-card border border-surface bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-secondary">{group.label}</p>
          {group.entries.length === 0 ? (
            <p className="text-xs text-muted">{t("none")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {group.entries.map((item) => (
                <li key={item.id} className="text-sm text-secondary">
                  {item.name}
                  {group.showDue && item.next_due_at && (
                    <span className="ml-1 text-xs text-muted">
                      {(() => {
                        const days = daysUntil(item.next_due_at);
                        if (days < 0) return t("daysOverdue", { count: Math.abs(days) });
                        if (days === 0) return t("dueToday");
                        return t("daysUntil", { count: days });
                      })()}
                    </span>
                  )}
                  {!group.showDue && item.last_completed_at && (
                    <span className="ml-1 text-xs text-muted">{item.last_completed_at}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
