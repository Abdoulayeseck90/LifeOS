import { getTranslations } from "next-intl/server";
import type { TimelineEvent } from "@/types/core/entities";
import { Link } from "@/lib/i18n/navigation";
import { TIMELINE_ENTITY_TYPE_LINK } from "@/lib/core/timeline-categories";

function formatDateTime(value: string, locale: string) {
  return new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}

// Shared per-category event list — same card rendering as before the
// tab redesign, just reused across every tab (All + each category)
// instead of living inline in one page.
export async function TimelineEventList({
  events,
  locale,
  emptyMessage,
}: {
  events: TimelineEvent[];
  locale: string;
  emptyMessage: string;
}) {
  const t = await getTranslations("timeline");

  if (events.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-surface p-8 text-center">
        <p className="text-sm text-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {events.map((event) => {
        // FibroScan gets its own dedicated history view — event_type
        // holds the actual test_type (e.g. "fibroscan"), distinct from
        // related_entity_type which is always "diagnostic_test".
        const href =
          event.event_type === "fibroscan"
            ? "/health/diagnostic-tests/fibroscan"
            : event.related_entity_type
              ? TIMELINE_ENTITY_TYPE_LINK[event.related_entity_type]
              : undefined;

        return (
          <div key={event.id} className="rounded-card border border-surface bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-secondary">{event.title}</p>
                <p className="mt-1 text-xs text-muted">{formatDateTime(event.date_time, locale)}</p>
              </div>
              <span className="whitespace-nowrap rounded bg-surface px-2 py-0.5 text-xs font-medium text-muted">
                {t.has(`eventType.${event.event_type}`) ? t(`eventType.${event.event_type}`) : event.event_type}
              </span>
            </div>
            {event.description && <p className="mt-2 text-sm text-muted">{event.description}</p>}
            {href && (
              <Link href={href} className="mt-2 inline-block text-xs text-primary hover:underline">
                {t("viewDetails")}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
