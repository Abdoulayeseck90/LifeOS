import { getTranslations } from "next-intl/server";
import { listMonitoringItems } from "@/services/health/monitoring";
import { listAppointmentOccurrences } from "@/services/core/appointments";
import { listConditions } from "@/services/health/conditions";
import { CalendarView, type CalendarEntry } from "@/components/calendar/calendar-view";
import { AppointmentAddButton } from "@/components/calendar/appointment-add-button";

// The global LifeOS Calendar (Calendar spec) — the one place appointments
// of any kind (medical, work, personal, financial, travel, other) are
// created, viewed, edited, and deleted; Health's own Appointments page
// now just redirects here. Occurrences (including recurring ones) are
// expanded server-side via listAppointmentOccurrences() over a bounded
// +/-2 year window — generous enough for realistic month/week/day
// navigation without materializing an unbounded series. Only Health has
// a second real event source today (monitoring due dates);
// Planning/Travel/Business are meant to append their own sources to the
// same `entries` array once those modules exist — CalendarView's
// rendering is already domain-agnostic, keyed only by module/type
// strings. Per-user data behind auth — never statically prerendered.
export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const t = await getTranslations("calendar");
  const now = new Date();
  const rangeStart = new Date(now.getTime() - 2 * 365 * 86_400_000);
  const rangeEnd = new Date(now.getTime() + 2 * 365 * 86_400_000);

  const [items, occurrences, conditions] = await Promise.all([
    listMonitoringItems(),
    listAppointmentOccurrences(rangeStart, rangeEnd),
    listConditions(),
  ]);

  const today = now.toISOString().slice(0, 10);

  const entries: CalendarEntry[] = [
    ...items
      .filter((item) => item.status === "active" && item.next_due_at && item.next_due_at >= today)
      .map((item) => ({
        date: item.next_due_at as string,
        dateTime: null,
        title: item.name,
        module: "health",
        type: "monitoring",
      })),
    ...occurrences.map((occurrence) => ({
      date: occurrence.occurrenceStart.slice(0, 10),
      dateTime: occurrence.occurrenceStart,
      title: occurrence.appointment.title ?? occurrence.appointment.provider_name ?? t("appointmentWith"),
      module: "health",
      type: "appointment",
      location: occurrence.appointment.location ?? undefined,
      status: occurrence.appointment.status,
      appointment: occurrence.appointment,
      occurrenceStart: occurrence.occurrenceStart,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <CalendarView
      title={t("title")}
      subtitle={t("subtitle")}
      entries={entries}
      addAction={<AppointmentAddButton conditions={conditions} />}
      conditions={conditions}
    />
  );
}
