"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Appointment, AppointmentCategory, Condition, RecurrenceEditScope } from "@/types/health/entities";
import type { RecordFormRenderProps } from "@/components/core/record-form-modal";
import {
  buildRecurrenceRule,
  parseRecurrenceRule,
  DEFAULT_RECURRENCE_FORM_VALUE,
  type RecurrenceFormValue,
  type RecurrenceFrequency,
  type MonthlyPattern,
  type CustomUnit,
} from "@/lib/calendar/recurrence-builder";
import { FormField } from "@/components/core/form/form-field";
import { LifeOSInput } from "@/components/core/form/lifeos-input";
import { LifeOSSelect } from "@/components/core/form/lifeos-select";
import { LifeOSTextarea } from "@/components/core/form/lifeos-textarea";
import { LifeOSCheckbox } from "@/components/core/form/lifeos-checkbox";
import { LifeOSFormActions } from "@/components/core/form/lifeos-form-actions";
import { RecurrenceScopeDialog } from "@/components/calendar/recurrence-scope-dialog";

const CATEGORIES: AppointmentCategory[] = ["medical", "work", "personal", "financial", "travel", "other"];
const FREQUENCIES: RecurrenceFrequency[] = ["daily", "weekly", "monthly", "yearly", "custom"];
const CUSTOM_UNITS: CustomUnit[] = ["days", "weeks", "months", "years"];
const REMINDER_PRESETS = [30, 60, 1440, 10080] as const; // 30 min, 1 hour, 1 day, 1 week
const WEEKDAY_INDEXES = [0, 1, 2, 3, 4, 5, 6];

function toDatetimeLocalValue(iso: string): string {
  // datetime-local inputs want "YYYY-MM-DDTHH:mm" in local time, not a
  // full ISO string with seconds/timezone.
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function combineDateTime(value: string): string {
  // Bare "YYYY-MM-DDTHH:mm" has no timezone — `new Date()` parses that
  // as local time, the one context where that default is exactly right
  // (same fix already applied to Health's appointment/vitals forms).
  return new Date(value).toISOString();
}

// Calendar spec: create/edit any kind of scheduled appointment (medical
// or otherwise), with optional recurrence. Hosted inside RecordFormModal
// (create: AddRecordButton, edit: the per-entry "Edit" trigger).
// `occurrenceStart` identifies which generated instant is being edited
// (may differ from appointment.date_time — a recurring master's DTSTART
// isn't necessarily the occurrence the user clicked on); required
// whenever `appointment` is part of a recurring series.
export function AppointmentForm({
  conditions,
  appointment,
  occurrenceStart,
  closeAfterSave,
  requestClose,
  registerDirty,
}: {
  conditions: Condition[];
  occurrenceStart?: string;
} & Partial<{ appointment: Appointment }> &
  RecordFormRenderProps) {
  const t = useTranslations("appointments.form");
  const tCalendar = useTranslations("calendar");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const effectiveStart = occurrenceStart ?? appointment?.date_time;

  const [title, setTitle] = useState(appointment?.title ?? appointment?.provider_name ?? "");
  const [description, setDescription] = useState(appointment?.description ?? "");
  const [dateTime, setDateTime] = useState(effectiveStart ? toDatetimeLocalValue(effectiveStart) : "");
  const [location, setLocation] = useState(appointment?.location ?? "");
  const [category, setCategory] = useState<AppointmentCategory>(appointment?.category ?? "personal");
  const [status, setStatus] = useState<Appointment["status"]>(appointment?.status ?? "scheduled");
  const [appointmentType, setAppointmentType] = useState(appointment?.appointment_type ?? "");
  const [specialty, setSpecialty] = useState(appointment?.specialty ?? "");
  const [relatedConditionId, setRelatedConditionId] = useState(appointment?.related_condition_id ?? "");
  const [preparationNotes, setPreparationNotes] = useState(appointment?.preparation_notes ?? "");
  const [clinicianInstructions, setClinicianInstructions] = useState(appointment?.clinician_instructions ?? "");
  const [followUpDate, setFollowUpDate] = useState(appointment?.follow_up_date ?? "");
  const [notes, setNotes] = useState(appointment?.notes ?? "");
  const [reminderPreset, setReminderPreset] = useState<string>(
    appointment?.reminder_lead_minutes
      ? REMINDER_PRESETS.includes(appointment.reminder_lead_minutes as (typeof REMINDER_PRESETS)[number])
        ? String(appointment.reminder_lead_minutes)
        : "custom"
      : ""
  );
  const [reminderCustomMinutes, setReminderCustomMinutes] = useState(
    appointment?.reminder_lead_minutes && !REMINDER_PRESETS.includes(appointment.reminder_lead_minutes as (typeof REMINDER_PRESETS)[number])
      ? String(appointment.reminder_lead_minutes)
      : ""
  );

  const [isRecurring, setIsRecurring] = useState(Boolean(appointment?.recurrence_rule));
  const [recurrence, setRecurrence] = useState<RecurrenceFormValue>(() =>
    appointment?.recurrence_rule && effectiveStart
      ? parseRecurrenceRule(appointment.recurrence_rule, new Date(effectiveStart))
      : DEFAULT_RECURRENCE_FORM_VALUE
  );

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);

  const isPartOfSeries = Boolean(appointment?.recurrence_rule || appointment?.recurrence_parent_id);

  const fieldValues = {
    title,
    description,
    dateTime,
    location,
    category,
    status,
    appointmentType,
    specialty,
    relatedConditionId,
    preparationNotes,
    clinicianInstructions,
    followUpDate,
    notes,
    reminderPreset,
    reminderCustomMinutes,
    isRecurring,
    recurrence,
  };
  const initialSnapshot = useRef(JSON.stringify(fieldValues));
  useEffect(() => {
    registerDirty(JSON.stringify(fieldValues) !== initialSnapshot.current);
  });

  function resolvedReminderLeadMinutes(): number | null {
    if (!reminderPreset) return null;
    if (reminderPreset === "custom") {
      const n = parseInt(reminderCustomMinutes, 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    return parseInt(reminderPreset, 10);
  }

  function buildPayload(): Record<string, unknown> {
    const dateTimeIso = combineDateTime(dateTime);
    return {
      title: title.trim(),
      description: description.trim() || null,
      date_time: dateTimeIso,
      location: location.trim() || undefined,
      category,
      status,
      appointment_type: appointmentType.trim() || undefined,
      specialty: category === "medical" ? specialty.trim() || undefined : undefined,
      related_condition_id: category === "medical" ? relatedConditionId || null : null,
      preparation_notes: category === "medical" ? preparationNotes.trim() || undefined : undefined,
      clinician_instructions: category === "medical" ? clinicianInstructions.trim() || undefined : undefined,
      follow_up_date: category === "medical" ? followUpDate || undefined : undefined,
      notes: notes.trim() || undefined,
      reminder_lead_minutes: resolvedReminderLeadMinutes(),
      recurrence_rule: isRecurring ? buildRecurrenceRule(recurrence, new Date(dateTimeIso)) : null,
    };
  }

  function validate(): string | null {
    if (!title.trim()) return t("titleRequired");
    if (!dateTime) return t("dateTimeRequired");
    if (isRecurring && recurrence.frequency === "weekly" && recurrence.weeklyDays.length === 0) return t("weeklyDaysRequired");
    if (isRecurring && recurrence.endType === "on_date" && !recurrence.endDate) return t("endDateRequired");
    return null;
  }

  async function submit(scope: RecurrenceEditScope) {
    setSubmitting(true);
    setError(null);

    const payload = buildPayload();
    const body = JSON.stringify(
      appointment ? { ...payload, scope, occurrence_start: effectiveStart } : payload
    );

    const response = appointment
      ? await fetch(`/api/calendar/appointments/${appointment.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body })
      : await fetch("/api/calendar/appointments", { method: "POST", headers: { "Content-Type": "application/json" }, body });

    setSubmitting(false);

    if (!response.ok) {
      const responseBody = await response.json().catch(() => null);
      setError(typeof responseBody?.error === "string" ? responseBody.error : t("saveError"));
      return;
    }

    registerDirty(false);
    closeAfterSave();
    router.refresh();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);

    if (appointment && isPartOfSeries) {
      setScopeDialogOpen(true);
      return;
    }

    await submit("series");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <p className="text-sm text-status-urgent">{error}</p>}

      <FormField label={t("titleLabel")} htmlFor="appointment-title" required>
        <LifeOSInput id="appointment-title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("titlePlaceholder")} />
      </FormField>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label={t("dateTime")} htmlFor="appointment-datetime" required>
          <LifeOSInput id="appointment-datetime" type="datetime-local" required value={dateTime} onChange={(e) => setDateTime(e.target.value)} />
        </FormField>
        <FormField label={t("status")} htmlFor="appointment-status">
          <LifeOSSelect id="appointment-status" value={status} onChange={(e) => setStatus(e.target.value as Appointment["status"])}>
            <option value="scheduled">{t("statusOptions.scheduled")}</option>
            <option value="completed">{t("statusOptions.completed")}</option>
            <option value="cancelled">{t("statusOptions.cancelled")}</option>
            <option value="no_show">{t("statusOptions.no_show")}</option>
          </LifeOSSelect>
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label={t("location")} htmlFor="appointment-location" optional>
          <LifeOSInput id="appointment-location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} />
        </FormField>
        <FormField label={t("category")} htmlFor="appointment-category">
          <LifeOSSelect id="appointment-category" value={category} onChange={(e) => setCategory(e.target.value as AppointmentCategory)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {tCalendar(`categories.${c}`)}
              </option>
            ))}
          </LifeOSSelect>
        </FormField>
      </div>

      <FormField label={t("reminder")} htmlFor="appointment-reminder" helperText={t("reminderHelper")}>
        <LifeOSSelect id="appointment-reminder" value={reminderPreset} onChange={(e) => setReminderPreset(e.target.value)}>
          <option value="">{t("reminderOptions.none")}</option>
          <option value="30">{t("reminderOptions.thirtyMinutes")}</option>
          <option value="60">{t("reminderOptions.oneHour")}</option>
          <option value="1440">{t("reminderOptions.oneDay")}</option>
          <option value="10080">{t("reminderOptions.oneWeek")}</option>
          <option value="custom">{t("reminderOptions.custom")}</option>
        </LifeOSSelect>
      </FormField>
      {reminderPreset === "custom" && (
        <FormField label={t("reminderCustomMinutes")} htmlFor="appointment-reminder-custom">
          <LifeOSInput
            id="appointment-reminder-custom"
            type="number"
            min={1}
            value={reminderCustomMinutes}
            onChange={(e) => setReminderCustomMinutes(e.target.value)}
          />
        </FormField>
      )}

      <div className="rounded-card border border-surface p-3">
        <LifeOSCheckbox label={t("repeats")} checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />

        {isRecurring && (
          <div className="mt-3 flex flex-col gap-3">
            {isPartOfSeries && <p className="text-xs text-muted">{t("recurrenceAppliesNote")}</p>}

            <FormField label={t("frequency")} htmlFor="appointment-frequency">
              <LifeOSSelect
                id="appointment-frequency"
                value={recurrence.frequency}
                onChange={(e) => setRecurrence({ ...recurrence, frequency: e.target.value as RecurrenceFrequency })}
              >
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {t(`recurrenceFrequency.${f}`)}
                  </option>
                ))}
              </LifeOSSelect>
            </FormField>

            {recurrence.frequency === "weekly" && (
              <div>
                <p className="mb-1.5 text-sm font-medium text-secondary">{t("weeklyDays")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAY_INDEXES.map((day) => {
                    const active = recurrence.weeklyDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() =>
                          setRecurrence({
                            ...recurrence,
                            weeklyDays: active ? recurrence.weeklyDays.filter((d) => d !== day) : [...recurrence.weeklyDays, day].sort(),
                          })
                        }
                        className={`min-h-11 min-w-11 rounded border px-2 text-xs font-medium ${
                          active ? "border-primary bg-primary text-primary-foreground" : "border-surface text-secondary hover:bg-surface"
                        }`}
                      >
                        {t(`weekdaysShort.${day}`)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {recurrence.frequency === "monthly" && (
              <FormField label={t("monthlyPattern")} htmlFor="appointment-monthly-pattern">
                <LifeOSSelect
                  id="appointment-monthly-pattern"
                  value={recurrence.monthlyPattern}
                  onChange={(e) => setRecurrence({ ...recurrence, monthlyPattern: e.target.value as MonthlyPattern })}
                >
                  <option value="same_day">{t("monthlyPatternOptions.same_day")}</option>
                  <option value="first_weekday">{t("monthlyPatternOptions.first_weekday")}</option>
                  <option value="last_weekday">{t("monthlyPatternOptions.last_weekday")}</option>
                </LifeOSSelect>
              </FormField>
            )}

            {recurrence.frequency === "custom" && (
              <div className="grid grid-cols-2 gap-3">
                <FormField label={t("customEvery")} htmlFor="appointment-custom-interval">
                  <LifeOSInput
                    id="appointment-custom-interval"
                    type="number"
                    min={1}
                    value={recurrence.interval}
                    onChange={(e) => setRecurrence({ ...recurrence, interval: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                  />
                </FormField>
                <FormField label={t("customUnit")} htmlFor="appointment-custom-unit">
                  <LifeOSSelect
                    id="appointment-custom-unit"
                    value={recurrence.customUnit}
                    onChange={(e) => setRecurrence({ ...recurrence, customUnit: e.target.value as CustomUnit })}
                  >
                    {CUSTOM_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {t(`customUnitOptions.${unit}`)}
                      </option>
                    ))}
                  </LifeOSSelect>
                </FormField>
              </div>
            )}

            <FormField label={t("recurrenceEnd")} htmlFor="appointment-recurrence-end">
              <LifeOSSelect
                id="appointment-recurrence-end"
                value={recurrence.endType}
                onChange={(e) => setRecurrence({ ...recurrence, endType: e.target.value as RecurrenceFormValue["endType"] })}
              >
                <option value="never">{t("recurrenceEndOptions.never")}</option>
                <option value="on_date">{t("recurrenceEndOptions.on_date")}</option>
                <option value="after_count">{t("recurrenceEndOptions.after_count")}</option>
              </LifeOSSelect>
            </FormField>
            {recurrence.endType === "on_date" && (
              <FormField label={t("recurrenceEndDate")} htmlFor="appointment-recurrence-end-date">
                <LifeOSInput
                  id="appointment-recurrence-end-date"
                  type="date"
                  value={recurrence.endDate}
                  onChange={(e) => setRecurrence({ ...recurrence, endDate: e.target.value })}
                />
              </FormField>
            )}
            {recurrence.endType === "after_count" && (
              <FormField label={t("recurrenceEndCount")} htmlFor="appointment-recurrence-end-count">
                <LifeOSInput
                  id="appointment-recurrence-end-count"
                  type="number"
                  min={1}
                  value={recurrence.endCount}
                  onChange={(e) => setRecurrence({ ...recurrence, endCount: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                />
              </FormField>
            )}
          </div>
        )}
      </div>

      <button type="button" onClick={() => setExpanded((v) => !v)} className="w-fit text-sm text-primary hover:underline">
        {expanded ? t("fewerDetails") : t("moreDetails")}
      </button>

      {expanded && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label={t("description")} htmlFor="appointment-description" optional className="sm:col-span-2">
            <LifeOSTextarea id="appointment-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </FormField>
          <FormField label={t("appointmentType")} htmlFor="appointment-type" optional>
            <LifeOSInput id="appointment-type" type="text" value={appointmentType} onChange={(e) => setAppointmentType(e.target.value)} />
          </FormField>

          {category === "medical" && (
            <>
              <FormField label={t("specialty")} htmlFor="appointment-specialty" optional>
                <LifeOSInput id="appointment-specialty" type="text" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
              </FormField>
              <FormField label={t("relatedCondition")} htmlFor="appointment-related-condition" optional>
                <LifeOSSelect id="appointment-related-condition" value={relatedConditionId} onChange={(e) => setRelatedConditionId(e.target.value)}>
                  <option value="">{t("noCondition")}</option>
                  {conditions.map((condition) => (
                    <option key={condition.id} value={condition.id}>
                      {condition.name}
                    </option>
                  ))}
                </LifeOSSelect>
              </FormField>
              <FormField label={t("followUpDate")} htmlFor="appointment-follow-up-date" optional>
                <LifeOSInput id="appointment-follow-up-date" type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
              </FormField>
              <FormField label={t("preparationNotes")} htmlFor="appointment-preparation-notes" optional className="sm:col-span-2">
                <LifeOSTextarea id="appointment-preparation-notes" value={preparationNotes} onChange={(e) => setPreparationNotes(e.target.value)} rows={2} />
              </FormField>
              <FormField label={t("clinicianInstructions")} htmlFor="appointment-clinician-instructions" optional className="sm:col-span-2">
                <LifeOSTextarea id="appointment-clinician-instructions" value={clinicianInstructions} onChange={(e) => setClinicianInstructions(e.target.value)} rows={2} />
              </FormField>
            </>
          )}

          <FormField label={t("notes")} htmlFor="appointment-notes" optional className="sm:col-span-2">
            <LifeOSTextarea id="appointment-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </FormField>
        </div>
      )}

      <LifeOSFormActions onCancel={requestClose} submitting={submitting} submitLabel={tCommon("save")} />

      <RecurrenceScopeDialog
        open={scopeDialogOpen}
        onOpenChange={setScopeDialogOpen}
        title={tCalendar("recurrenceScope.editTitle")}
        onConfirm={submit}
      />
    </form>
  );
}
