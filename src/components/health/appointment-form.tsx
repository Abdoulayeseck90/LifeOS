"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Appointment, Condition } from "@/types/health/entities";
import type { RecordFormRenderProps } from "@/components/core/record-form-modal";

function toDatetimeLocalValue(iso: string): string {
  // datetime-local inputs want "YYYY-MM-DDTHH:mm" in local time, not a
  // full ISO string with seconds/timezone.
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Hosted inside RecordFormModal (create: AddRecordButton, edit: the
// per-card "Edit" trigger) — no longer manages its own open/collapsed
// state, and no longer renders its own card chrome (the Modal provides
// that). Passing an `appointment` switches this into edit mode (PATCH
// against /api/health/appointments/[id] instead of POST).
export function AppointmentForm({
  conditions,
  appointment,
  closeAfterSave,
  requestClose,
  registerDirty,
}: {
  conditions: Condition[];
} & Partial<{ appointment: Appointment }> &
  RecordFormRenderProps) {
  const t = useTranslations("appointments.form");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [providerName, setProviderName] = useState(appointment?.provider_name ?? "");
  const [specialty, setSpecialty] = useState(appointment?.specialty ?? "");
  const [appointmentType, setAppointmentType] = useState(appointment?.appointment_type ?? "");
  const [dateTime, setDateTime] = useState(appointment ? toDatetimeLocalValue(appointment.date_time) : "");
  const [location, setLocation] = useState(appointment?.location ?? "");
  const [status, setStatus] = useState<Appointment["status"]>(appointment?.status ?? "scheduled");
  const [relatedConditionId, setRelatedConditionId] = useState(appointment?.related_condition_id ?? "");
  const [preparationNotes, setPreparationNotes] = useState(appointment?.preparation_notes ?? "");
  const [clinicianInstructions, setClinicianInstructions] = useState(appointment?.clinician_instructions ?? "");
  const [followUpDate, setFollowUpDate] = useState(appointment?.follow_up_date ?? "");
  const [notes, setNotes] = useState(appointment?.notes ?? "");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const dirty =
      providerName !== (appointment?.provider_name ?? "") ||
      specialty !== (appointment?.specialty ?? "") ||
      appointmentType !== (appointment?.appointment_type ?? "") ||
      dateTime !== (appointment ? toDatetimeLocalValue(appointment.date_time) : "") ||
      location !== (appointment?.location ?? "") ||
      status !== (appointment?.status ?? "scheduled") ||
      relatedConditionId !== (appointment?.related_condition_id ?? "") ||
      preparationNotes !== (appointment?.preparation_notes ?? "") ||
      clinicianInstructions !== (appointment?.clinician_instructions ?? "") ||
      followUpDate !== (appointment?.follow_up_date ?? "") ||
      notes !== (appointment?.notes ?? "");
    registerDirty(dirty);
  }, [
    providerName,
    specialty,
    appointmentType,
    dateTime,
    location,
    status,
    relatedConditionId,
    preparationNotes,
    clinicianInstructions,
    followUpDate,
    notes,
    appointment,
    registerDirty,
  ]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!providerName.trim()) {
      setError(t("providerRequired"));
      return;
    }
    if (!dateTime) {
      setError(t("dateTimeRequired"));
      return;
    }

    setSubmitting(true);

    const body = JSON.stringify({
      provider_name: providerName.trim(),
      // datetime-local's value is a bare "YYYY-MM-DDTHH:mm" wall-clock
      // string with no timezone info — sending it as-is let Postgres
      // interpret it as literal UTC instead of the browser's local time,
      // silently shifting every saved appointment by the user's UTC
      // offset. new Date() parses a bare datetime-local string as local
      // time (the one context where that default is exactly right), so
      // .toISOString() correctly converts it to the real UTC instant.
      date_time: new Date(dateTime).toISOString(),
      specialty: specialty.trim() || undefined,
      appointment_type: appointmentType.trim() || undefined,
      location: location.trim() || undefined,
      status,
      related_condition_id: relatedConditionId || undefined,
      preparation_notes: preparationNotes.trim() || undefined,
      clinician_instructions: clinicianInstructions.trim() || undefined,
      follow_up_date: followUpDate || undefined,
      notes: notes.trim() || undefined,
    });

    const response = appointment
      ? await fetch(`/api/health/appointments/${appointment.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body,
        })
      : await fetch("/api/health/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });

    setSubmitting(false);

    if (!response.ok) {
      setError(t("saveError"));
      return;
    }

    registerDirty(false);
    closeAfterSave();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <p className="text-sm text-status-urgent">{error}</p>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("providerName")}
          <input
            type="text"
            required
            value={providerName}
            onChange={(e) => setProviderName(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("status")}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Appointment["status"])}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          >
            <option value="scheduled">{t("statusOptions.scheduled")}</option>
            <option value="completed">{t("statusOptions.completed")}</option>
            <option value="cancelled">{t("statusOptions.cancelled")}</option>
            <option value="no_show">{t("statusOptions.no_show")}</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("specialty")}
          <input
            type="text"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("dateTime")}
          <input
            type="datetime-local"
            required
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-muted md:col-span-2">
          {t("location")}
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-fit text-sm text-primary hover:underline"
      >
        {expanded ? t("fewerDetails") : t("moreDetails")}
      </button>

      {expanded && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("appointmentType")}
            <input
              type="text"
              value={appointmentType}
              onChange={(e) => setAppointmentType(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("relatedCondition")}
            <select
              value={relatedConditionId}
              onChange={(e) => setRelatedConditionId(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            >
              <option value="">{t("noCondition")}</option>
              {conditions.map((condition) => (
                <option key={condition.id} value={condition.id}>
                  {condition.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted md:col-span-2">
            {t("followUpDate")}
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted md:col-span-2">
            {t("preparationNotes")}
            <textarea
              value={preparationNotes}
              onChange={(e) => setPreparationNotes(e.target.value)}
              rows={3}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted md:col-span-2">
            {t("clinicianInstructions")}
            <textarea
              value={clinicianInstructions}
              onChange={(e) => setClinicianInstructions(e.target.value)}
              rows={3}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted md:col-span-2">
            {t("notes")}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
        </div>
      )}

      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={requestClose}
          className="rounded border border-surface px-4 py-2 text-sm text-secondary"
        >
          {tCommon("cancel")}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {tCommon("save")}
        </button>
      </div>
    </form>
  );
}
