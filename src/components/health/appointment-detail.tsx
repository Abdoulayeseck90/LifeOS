"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Appointment } from "@/types/health/entities";
import { AppointmentStatusBadge } from "@/components/health/appointment-status-badge";

// Read-only view (Section 7) — prioritizes readability, shows every
// field but never an input; Edit is a separate explicit action.
export function AppointmentDetail({ appointment }: { appointment: Appointment }) {
  const t = useTranslations("appointments.form");
  const { locale } = useParams<{ locale: string }>();

  const fields: Array<[string, string | null]> = [
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
          <p className="text-secondary">{new Date(appointment.date_time).toLocaleString(locale)}</p>
        </div>
        <AppointmentStatusBadge status={appointment.status} />
      </div>

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
