"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations, useLocale } from "next-intl";
import type { Appointment, Condition } from "@/types/health/entities";
import type { AppointmentOccurrence } from "@/lib/calendar/recurrence";
import { AppointmentEntryModal } from "@/components/calendar/appointment-entry-modal";

type ViewMode = "list" | "week" | "month";

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameLocalDate(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function occurrenceHours(occurrence: AppointmentOccurrence<Appointment>): number {
  if (!occurrence.occurrenceEnd) return 0;
  return Math.max(0, (new Date(occurrence.occurrenceEnd).getTime() - new Date(occurrence.occurrenceStart).getTime()) / 3_600_000);
}

function totalsFor(occurrences: AppointmentOccurrence<Appointment>[]): { hours: number; goal: number; shifts: number } {
  let hours = 0;
  let goal = 0;
  for (const occurrence of occurrences) {
    hours += occurrenceHours(occurrence);
    if (occurrence.appointment.gig_earnings_goal != null) goal += occurrence.appointment.gig_earnings_goal;
  }
  return { hours, goal, shifts: occurrences.length };
}

// A filtered agenda over the same appointments the full Calendar
// renders (category="work") — not a second calendar engine. Clicking a
// row reuses AppointmentEntryModal, the same view/edit/delete surface
// Calendar itself uses, so editing here stays in sync with Calendar.
//
// Gig Driving spec, Section 9: List/Week/Month is purely a grouping/
// summing presentation layer over the same `occurrences` array the
// flat list already receives — no new date-grid engine, no new
// recurrence logic, so this stays a view over Calendar data rather than
// a second calendar component.
export function GigScheduleList({
  occurrences,
  conditions,
}: {
  occurrences: AppointmentOccurrence<Appointment>[];
  conditions: Condition[];
}) {
  const t = useTranslations("gigDriving.schedule");
  const locale = useLocale();
  const [selected, setSelected] = useState<AppointmentOccurrence<Appointment> | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  const weekStart = useMemo(() => addDays(startOfWeek(new Date()), weekOffset * 7), [weekOffset]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const monthAnchor = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [monthOffset]);

  function openEntry(occurrence: AppointmentOccurrence<Appointment>) {
    setSelected(occurrence);
  }

  function renderOccurrenceSummary(occurrence: AppointmentOccurrence<Appointment>) {
    const start = new Date(occurrence.occurrenceStart);
    const end = occurrence.occurrenceEnd ? new Date(occurrence.occurrenceEnd) : null;
    return (
      <button
        key={`${occurrence.sourceId}-${occurrence.occurrenceStart}`}
        type="button"
        onClick={() => openEntry(occurrence)}
        className="flex w-full min-h-11 items-center justify-between rounded-card border border-surface bg-white px-3 py-2 text-left hover:bg-surface"
      >
        <div>
          <p className="text-sm font-medium text-secondary">{occurrence.appointment.title ?? t("untitled")}</p>
          <p className="text-xs text-muted">
            {start.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}
            {end ? ` – ${end.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}` : ""}
          </p>
        </div>
        {occurrence.appointment.gig_earnings_goal != null && (
          <p className="text-xs font-medium text-muted">
            {t("goal")}: {occurrence.appointment.gig_earnings_goal.toLocaleString(undefined, { style: "currency", currency: "USD" })}
          </p>
        )}
      </button>
    );
  }

  const viewToggle = (
    <div className="flex gap-2">
      {(["list", "week", "month"] as ViewMode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => setViewMode(mode)}
          className={`min-h-11 rounded border px-3 py-1.5 text-sm font-medium ${
            viewMode === mode ? "border-primary bg-primary text-primary-foreground" : "border-surface text-secondary hover:bg-surface"
          }`}
        >
          {t(`view.${mode}`)}
        </button>
      ))}
    </div>
  );

  let content: ReactNode;

  if (occurrences.length === 0 && viewMode === "list") {
    content = <p className="text-sm text-muted">{t("empty")}</p>;
  } else if (viewMode === "week") {
    const weekOccurrences = occurrences.filter((o) => weekDays.some((d) => isSameLocalDate(d, new Date(o.occurrenceStart))));
    const totals = totalsFor(weekOccurrences);
    content = (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setWeekOffset((v) => v - 1)} className="min-h-11 px-2 text-sm text-primary hover:underline">
            {t("previous")}
          </button>
          <p className="text-sm font-medium text-secondary">
            {weekDays[0]!.toLocaleDateString(locale, { month: "short", day: "numeric" })} –{" "}
            {weekDays[6]!.toLocaleDateString(locale, { month: "short", day: "numeric" })}
          </p>
          <button type="button" onClick={() => setWeekOffset((v) => v + 1)} className="min-h-11 px-2 text-sm text-primary hover:underline">
            {t("next")}
          </button>
        </div>

        {weekDays.map((day) => {
          const dayOccurrences = occurrences
            .filter((o) => isSameLocalDate(day, new Date(o.occurrenceStart)))
            .sort((a, b) => a.occurrenceStart.localeCompare(b.occurrenceStart));
          return (
            <div key={day.toISOString()} className="rounded-card border border-surface p-2">
              <p className="mb-1.5 text-xs font-medium text-muted">{day.toLocaleDateString(locale, { weekday: "long", month: "short", day: "numeric" })}</p>
              {dayOccurrences.length === 0 ? (
                <p className="text-sm text-muted">{t("off")}</p>
              ) : (
                <div className="flex flex-col gap-1.5">{dayOccurrences.map(renderOccurrenceSummary)}</div>
              )}
            </div>
          );
        })}

        <div className="rounded-card border border-surface bg-surface/40 p-3 text-sm text-secondary">
          <p>{t("weeklyGoal", { goal: totals.goal.toFixed(2) })}</p>
          <p>{t("plannedHours", { hours: totals.hours.toFixed(1) })}</p>
          <p>{t("plannedShifts", { count: totals.shifts })}</p>
        </div>
      </div>
    );
  } else if (viewMode === "month") {
    const monthOccurrences = occurrences
      .filter((o) => {
        const d = new Date(o.occurrenceStart);
        return d.getFullYear() === monthAnchor.getFullYear() && d.getMonth() === monthAnchor.getMonth();
      })
      .sort((a, b) => a.occurrenceStart.localeCompare(b.occurrenceStart));
    const totals = totalsFor(monthOccurrences);

    content = (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setMonthOffset((v) => v - 1)} className="min-h-11 px-2 text-sm text-primary hover:underline">
            {t("previous")}
          </button>
          <p className="text-sm font-medium text-secondary">{monthAnchor.toLocaleDateString(locale, { month: "long", year: "numeric" })}</p>
          <button type="button" onClick={() => setMonthOffset((v) => v + 1)} className="min-h-11 px-2 text-sm text-primary hover:underline">
            {t("next")}
          </button>
        </div>

        {monthOccurrences.length === 0 ? (
          <p className="text-sm text-muted">{t("empty")}</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {monthOccurrences.map((occurrence) => (
              <div key={`${occurrence.sourceId}-${occurrence.occurrenceStart}`} className="flex flex-col gap-1">
                <p className="text-xs text-muted">
                  {new Date(occurrence.occurrenceStart).toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" })}
                </p>
                {renderOccurrenceSummary(occurrence)}
              </div>
            ))}
          </div>
        )}

        <div className="rounded-card border border-surface bg-surface/40 p-3 text-sm text-secondary">
          <p>{t("weeklyGoal", { goal: totals.goal.toFixed(2) })}</p>
          <p>{t("plannedHours", { hours: totals.hours.toFixed(1) })}</p>
          <p>{t("plannedShifts", { count: totals.shifts })}</p>
        </div>
      </div>
    );
  } else {
    content = <ul className="flex flex-col gap-2">{occurrences.map((occurrence) => <li key={`${occurrence.sourceId}-${occurrence.occurrenceStart}`}>{renderOccurrenceSummary(occurrence)}</li>)}</ul>;
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {viewToggle}
        {content}
      </div>

      {selected && (
        <AppointmentEntryModal
          open={Boolean(selected)}
          onOpenChange={(open) => !open && setSelected(null)}
          appointment={selected.appointment}
          occurrenceStart={selected.occurrenceStart}
          conditions={conditions}
        />
      )}
    </>
  );
}
