import { getTranslations } from "next-intl/server";
import { listMonitoringItems } from "@/services/health/monitoring";
import { listAppointments } from "@/services/health/appointments";
import { listConditions } from "@/services/health/conditions";
import { CalendarView, type CalendarEntry } from "@/components/health/calendar-view";
import { AppointmentAddButton } from "@/components/health/appointment-add-button";

// The global LifeOS Calendar (Master Redesign Section 18), not a
// Health-only page — moved from health/calendar. It answers "what's
// scheduled and when?" — the Health Timeline (health/timeline/page.tsx)
// answers "what happened and when?"; the two are deliberately not
// merged. Only Health has real event sources today (monitoring due
// dates + upcoming appointments); Planning/Travel/Business are meant to
// append their own sources to the same `entries` array once those
// modules exist — CalendarView's rendering is already domain-agnostic,
// keyed only by module/type strings (see its CalendarEntry type: id,
// title, date, time, type, module, status, location all already
// supported), so no rework is needed when that happens. "+ Add" reuses
// the existing Appointment form — appointments are the only entity a
// user can directly schedule today; no fake generic "event" entity
// invented for the button to feed into.
// Per-user data behind auth — never statically prerendered.
export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const t = await getTranslations("calendar");
  const [items, appointments, conditions] = await Promise.all([
    listMonitoringItems(),
    listAppointments(),
    listConditions(),
  ]);

  const today = new Date().toISOString().slice(0, 10);

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
    ...appointments
      .filter((appointment) => appointment.status === "scheduled" && appointment.date_time.slice(0, 10) >= today)
      .map((appointment) => ({
        date: appointment.date_time.slice(0, 10),
        dateTime: appointment.date_time,
        title: `${t("appointmentWith")} ${appointment.provider_name}`,
        module: "health",
        type: "appointment",
        location: appointment.location ?? undefined,
        status: appointment.status,
      })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <CalendarView
      title={t("title")}
      subtitle={t("subtitle")}
      entries={entries}
      addAction={<AppointmentAddButton conditions={conditions} />}
    />
  );
}
