"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type CalendarEntry = {
  date: string; // "YYYY-MM-DD"
  dateTime: string | null; // full ISO instant when a real time exists (appointments); null for date-only entries (monitoring)
  title: string;
  module: string; // e.g. "health" — translated via calendar.modules.*, also the color-dot key (see MODULE_DOT_CLASSES)
  type: string; // e.g. "appointment" | "monitoring" — translated via calendar.types.*
  location?: string;
  status?: string; // translated via calendar.statuses.* when present; omitted entirely when it wouldn't add information
};

const FILTER_MODULES = ["health", "planning", "travel", "business", "finance", "projects"] as const;

// Only "health" has real data today — every other module gets one shared
// neutral color rather than inventing 6 distinct accent colors for
// modules with no events yet (that would be designing for data that
// doesn't exist). Swapping a module from this neutral default to its
// own accent is a one-line change once that module actually ships.
const MODULE_DOT_CLASSES: Record<string, string> = {
  health: "bg-primary",
};
const DEFAULT_MODULE_DOT_CLASS = "bg-secondary/40";

function moduleDotClass(module: string): string {
  return MODULE_DOT_CLASSES[module] ?? DEFAULT_MODULE_DOT_CLASS;
}

function toDateOnly(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Always a fixed 6-row (42-cell) grid so the page height doesn't jump
// between a 4-week and a 6-week month.
function buildMonthGrid(focusMonth: Date): Date[] {
  const firstOfMonth = new Date(focusMonth.getFullYear(), focusMonth.getMonth(), 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

function EventCard({ entry, t, locale }: { entry: CalendarEntry; t: ReturnType<typeof useTranslations>; locale: string }) {
  return (
    <div className="rounded-card border border-surface bg-white p-3">
      <div className="flex items-start gap-2">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${moduleDotClass(entry.module)}`} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted">
            {entry.dateTime
              ? new Date(entry.dateTime).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })
              : t("dueLabel")}
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-secondary">{entry.title}</p>
          <p className="mt-0.5 text-xs text-muted">
            {t(`types.${entry.type}`)} · {t(`modules.${entry.module}`)}
          </p>
          {entry.location && <p className="mt-0.5 text-xs text-muted">{entry.location}</p>}
          {/* "scheduled" is the implicit default for everything shown here
              (the calendar only ever lists future/active items) — only a
              status that actually diverges from that is worth a line. */}
          {entry.status && entry.status !== "scheduled" && (
            <p className="mt-0.5 text-xs text-muted">{t.has(`statuses.${entry.status}`) ? t(`statuses.${entry.status}`) : entry.status}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Agenda (default) and Month views over the same entries array — no
// separate data-fetching per view. Designed so future modules
// (Planning/Travel/etc.) only ever need to add more entries with their
// own `module` value — see calendar/page.tsx and MODULE_DOT_CLASSES.
export function CalendarView({
  title,
  subtitle,
  entries,
  addAction,
}: {
  title: string;
  subtitle: string;
  entries: CalendarEntry[];
  addAction: React.ReactNode;
}) {
  const t = useTranslations("calendar");
  const { locale } = useParams<{ locale: string }>();
  const [view, setView] = useState<"agenda" | "month">("agenda");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [focusMonth, setFocusMonth] = useState(() => new Date());

  const filteredEntries = moduleFilter === "all" ? entries : entries.filter((e) => e.module === moduleFilter);

  const agendaGroups = useMemo(() => {
    const groups: Record<string, CalendarEntry[]> = {};
    for (const entry of filteredEntries) {
      (groups[entry.date] ??= []).push(entry);
    }
    return groups;
  }, [filteredEntries]);
  const agendaDateKeys = Object.keys(agendaGroups).sort();

  const entriesByDate = useMemo(() => {
    const map: Record<string, CalendarEntry[]> = {};
    for (const entry of filteredEntries) {
      (map[entry.date] ??= []).push(entry);
    }
    return map;
  }, [filteredEntries]);

  const monthGrid = useMemo(() => buildMonthGrid(focusMonth), [focusMonth]);
  const todayStr = toDateOnly(new Date());

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-secondary">{title}</h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFocusMonth(new Date())}
            className="inline-flex min-h-11 items-center rounded border border-surface px-3 text-sm text-secondary hover:bg-surface"
          >
            {t("today")}
          </button>
          <div className="flex rounded border border-surface p-0.5">
            <button
              type="button"
              onClick={() => setView("agenda")}
              aria-pressed={view === "agenda"}
              className={`inline-flex min-h-11 items-center rounded px-3 text-sm ${view === "agenda" ? "bg-primary text-primary-foreground" : "text-secondary"}`}
            >
              {t("viewAgenda")}
            </button>
            <button
              type="button"
              onClick={() => setView("month")}
              aria-pressed={view === "month"}
              className={`inline-flex min-h-11 items-center rounded px-3 text-sm ${view === "month" ? "bg-primary text-primary-foreground" : "text-secondary"}`}
            >
              {t("viewMonth")}
            </button>
          </div>
          {addAction}
        </div>
      </div>

      <div className="mb-6 mt-4 flex flex-wrap items-center justify-between gap-3">
        {view === "month" ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={t("previous")}
              onClick={() => setFocusMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              className="flex min-h-11 min-w-11 items-center justify-center rounded border border-surface text-secondary hover:bg-surface"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-32 px-1 text-center text-sm font-medium text-secondary">
              {focusMonth.toLocaleDateString(locale, { month: "long", year: "numeric" })}
            </span>
            <button
              type="button"
              aria-label={t("next")}
              onClick={() => setFocusMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              className="flex min-h-11 min-w-11 items-center justify-center rounded border border-surface text-secondary hover:bg-surface"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        ) : (
          <div />
        )}

        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          aria-label={t("filterLabel")}
          className="rounded border border-surface bg-white px-3 py-2 text-sm text-secondary"
        >
          <option value="all">{t("filterAll")}</option>
          {FILTER_MODULES.map((m) => (
            <option key={m} value={m}>
              {t(`modules.${m}`)}
            </option>
          ))}
        </select>
      </div>

      {view === "agenda" ? (
        agendaDateKeys.length === 0 ? (
          <div className="rounded-card border border-dashed border-surface p-10 text-center">
            <p className="text-sm font-medium text-secondary">{t("emptyTitle")}</p>
            <p className="mt-1 text-sm text-muted">{t("empty")}</p>
            <div className="mt-4 flex justify-center">{addAction}</div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {agendaDateKeys.map((dateKey) => {
              const date = new Date(`${dateKey}T00:00:00`);
              return (
                <div key={dateKey}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {date.toLocaleDateString(locale, { weekday: "long" })}
                  </p>
                  <h2 className="mb-2 text-sm font-semibold text-secondary">
                    {date.toLocaleDateString(locale, { month: "long", day: "numeric" })}
                  </h2>
                  <div className="flex flex-col gap-2">
                    {(agendaGroups[dateKey] ?? []).map((entry, index) => (
                      <EventCard key={`${dateKey}-${index}`} entry={entry} t={t} locale={locale} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="overflow-x-auto">
          <div className="grid min-w-[560px] grid-cols-7 gap-px overflow-hidden rounded-card border border-surface bg-surface text-xs font-semibold uppercase tracking-wide text-muted sm:min-w-0">
            {[0, 1, 2, 3, 4, 5, 6].map((weekday) => (
              <div key={weekday} className="bg-white px-2 py-1.5 text-center">
                {new Date(2024, 0, 7 + weekday).toLocaleDateString(locale, { weekday: "short" })}
              </div>
            ))}
          </div>
          <div className="grid min-w-[560px] grid-cols-7 gap-px overflow-hidden rounded-b-card border border-t-0 border-surface bg-surface sm:min-w-0">
            {monthGrid.map((day) => {
              const dateKey = toDateOnly(day);
              const inFocusMonth = day.getMonth() === focusMonth.getMonth();
              const isToday = dateKey === todayStr;
              const dayEntries = entriesByDate[dateKey] ?? [];

              return (
                <div key={dateKey} className={`min-h-20 bg-white p-1.5 sm:min-h-24 ${inFocusMonth ? "" : "bg-surface/40"}`}>
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                      isToday
                        ? "bg-primary font-semibold text-primary-foreground"
                        : inFocusMonth
                          ? "text-secondary"
                          : "text-muted"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  <div className="mt-1 flex flex-col gap-0.5">
                    {dayEntries.slice(0, 2).map((entry, index) => (
                      <div key={index} className="flex items-center gap-1 truncate text-[11px] text-secondary">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${moduleDotClass(entry.module)}`} />
                        <span className="truncate">{entry.title}</span>
                      </div>
                    ))}
                    {dayEntries.length > 2 && (
                      <p className="text-[11px] text-muted">{t("moreCount", { count: dayEntries.length - 2 })}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
