"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Appointment } from "@/types/health/entities";
import { AppointmentStatusBadge } from "@/components/calendar/appointment-status-badge";
import { Badge } from "@/components/core/badge";
import { isAppointmentPast } from "@/lib/calendar/appointment-status";

// Read-only view — prioritizes readability, shows every field but never
// an input; Edit is a separate explicit action. `occurrenceStart` is the
// specific instant being viewed (may differ from appointment.date_time
// for a recurring master — the DTSTART isn't necessarily the occurrence
// the user clicked on).
export function AppointmentDetail({
  appointment,
  occurrenceStart,
  occurrenceEnd = null,
}: {
  appointment: Appointment;
  occurrenceStart: string;
  occurrenceEnd?: string | null;
}) {
  const t = useTranslations("appointments.form");
  const tCalendar = useTranslations("calendar");
  const { locale } = useParams<{ locale: string }>();
  const past = isAppointmentPast(occurrenceStart, occurrenceEnd);

  const fields: Array<[string, string | null]> = [
    [t("description"), appointment.description],
    [t("specialty"), appointment.specialty],
    [t("appointmentType"), appointment.appointment_type],
    [t("location"), appointment.location],
    [t("followUpDate"), appointment.follow_up_date],
    [t("preparationNotes"), appointment.preparation_notes],
    [t("clinicianInstructions"), appointment.clinician_instructions],
    [t("notes"), appointment.notes],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted">{t("dateTime")}</p>
          <p className="text-secondary">
            {new Date(occurrenceStart).toLocaleString(locale)}
            {appointment.end_time &&
              ` – ${new Date(new Date(occurrenceStart).getTime() + (new Date(appointment.end_time).getTime() - new Date(appointment.date_time).getTime())).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {past && <Badge variant="neutral">{tCalendar("pastLabel")}</Badge>}
          <AppointmentStatusBadge status={appointment.status} />
        </div>
      </div>

      <div>
        <p className="text-xs text-muted">{t("category")}</p>
        <p className="text-secondary">{tCalendar(`categories.${appointment.category}`)}</p>
      </div>

      {appointment.recurrence_rule && (
        <div>
          <p className="text-xs text-muted">{tCalendar("recurrenceScope.recurring")}</p>
        </div>
      )}

      {fields
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <div key={label}>
            <p className="text-xs text-muted">{label}</p>
            <p className="whitespace-pre-wrap text-secondary">{value}</p>
          </div>
        ))}
    </div>
  );
}
