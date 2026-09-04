"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import type { Appointment, Condition } from "@/types/health/entities";
import type { AppointmentOccurrence } from "@/lib/calendar/recurrence";
import { AppointmentEntryModal } from "@/components/calendar/appointment-entry-modal";

// A filtered agenda over the same appointments the full Calendar
// renders (category="work") — not a second calendar engine. Clicking a
// row reuses AppointmentEntryModal, the same view/edit/delete surface
// Calendar itself uses, so editing here stays in sync with Calendar.
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

  if (occurrences.length === 0) {
    return <p className="text-sm text-muted">{t("empty")}</p>;
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {occurrences.map((occurrence) => {
          const date = new Date(occurrence.occurrenceStart);
          return (
            <li key={`${occurrence.sourceId}-${occurrence.occurrenceStart}`}>
              <button
                type="button"
                onClick={() => setSelected(occurrence)}
                className="flex w-full min-h-11 items-center justify-between rounded-card border border-surface bg-white px-4 py-3 text-left hover:bg-surface"
              >
                <div>
                  <p className="text-sm font-medium text-secondary">
                    {occurrence.appointment.title ?? t("untitled")}
                  </p>
                  <p className="text-xs text-muted">
                    {date.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" })} ·{" "}
                    {date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                {occurrence.appointment.gig_earnings_goal != null && (
                  <p className="text-xs font-medium text-muted">
                    {t("goal")}: {occurrence.appointment.gig_earnings_goal.toLocaleString(undefined, { style: "currency", currency: "USD" })}
                  </p>
                )}
              </button>
            </li>
          );
        })}
      </ul>

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
