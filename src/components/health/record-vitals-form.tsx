"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Condition, Appointment, VitalEntrySource } from "@/types/health/entities";
import type { Document } from "@/types/core/entities";
import type { RecordFormRenderProps } from "@/components/core/record-form-modal";
import { computeBmi } from "@/lib/health/bmi";
import { markVitalSaved } from "@/components/health/vital-saved-banner";

function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// The single "+ Record Vitals" entry point (Spec Section 4): one form,
// any subset of measurements from the same visit, submitted together to
// /api/health/vitals/record (services/health/vitals-session.ts) rather
// than one at a time. Editing an already-saved individual reading still
// uses the existing per-type forms (BloodPressureForm,
// VitalSingleValueForm, BodyMetricForm) — this form is create-only.
export function RecordVitalsForm({
  conditions,
  documents,
  appointments,
  closeAfterSave,
  requestClose,
  registerDirty,
}: {
  conditions: Condition[];
  documents: Document[];
  appointments: Appointment[];
} & RecordFormRenderProps) {
  const t = useTranslations("vitals.recordForm");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();

  const [recordedAt, setRecordedAt] = useState(() => toDatetimeLocalValue(new Date()));
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [temperature, setTemperature] = useState("");
  const [temperatureUnit, setTemperatureUnit] = useState<"°C" | "°F">("°C");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [spo2, setSpo2] = useState("");
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
  const [height, setHeight] = useState("");
  const [heightUnit, setHeightUnit] = useState<"cm" | "in">("cm");
  const [notes, setNotes] = useState("");
  const [source, setSource] = useState<VitalEntrySource>("manual");
  const [relatedConditionId, setRelatedConditionId] = useState("");
  const [relatedAppointmentId, setRelatedAppointmentId] = useState("");
  const [sourceDocumentId, setSourceDocumentId] = useState("");
  const [expanded, setExpanded] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fieldValues = {
    recordedAt,
    systolic,
    diastolic,
    heartRate,
    temperature,
    temperatureUnit,
    respiratoryRate,
    spo2,
    weight,
    weightUnit,
    height,
    heightUnit,
    notes,
    source,
    relatedConditionId,
    relatedAppointmentId,
    sourceDocumentId,
  };
  const initialSnapshot = useRef(JSON.stringify(fieldValues));
  useEffect(() => {
    registerDirty(JSON.stringify(fieldValues) !== initialSnapshot.current);
  });

  // Live preview only — the server recomputes and persists this same
  // value itself (Section 6: LifeOS-calculated BMI is never taken on
  // faith from the client).
  const bmiPreview = useMemo(() => {
    const weightNum = Number(weight);
    const heightNum = Number(height);
    if (!weight.trim() || !height.trim() || !Number.isFinite(weightNum) || !Number.isFinite(heightNum) || heightNum <= 0) {
      return null;
    }
    return computeBmi(weightNum, weightUnit, heightNum, heightUnit);
  }, [weight, weightUnit, height, heightUnit]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (systolic.trim() && !diastolic.trim()) {
      setError(t("bpPairRequired"));
      return;
    }
    if (diastolic.trim() && !systolic.trim()) {
      setError(t("bpPairRequired"));
      return;
    }

    const hasAnyMeasurement =
      systolic.trim() ||
      heartRate.trim() ||
      temperature.trim() ||
      respiratoryRate.trim() ||
      spo2.trim() ||
      weight.trim() ||
      height.trim();
    if (!hasAnyMeasurement) {
      setError(t("atLeastOneRequired"));
      return;
    }

    setSubmitting(true);

    const toNum = (s: string) => (s.trim() ? Number(s) : undefined);

    const body = JSON.stringify({
      recorded_at: new Date(recordedAt).toISOString(),
      systolic: toNum(systolic),
      diastolic: toNum(diastolic),
      heart_rate: toNum(heartRate),
      temperature_value: toNum(temperature),
      temperature_unit: temperatureUnit,
      respiratory_rate: toNum(respiratoryRate),
      spo2: toNum(spo2),
      weight_value: toNum(weight),
      weight_unit: weightUnit,
      height_value: toNum(height),
      height_unit: heightUnit,
      notes: notes.trim() || undefined,
      source,
      related_condition_id: relatedConditionId || undefined,
      related_appointment_id: relatedAppointmentId || undefined,
      source_document_id: sourceDocumentId || undefined,
    });

    const response = await fetch("/api/health/vitals/record", {
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
    markVitalSaved();
    closeAfterSave();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <p className="text-sm text-status-urgent">{error}</p>}

      <label className="flex flex-col gap-1.5 text-sm text-muted">
        {t("dateTime")}
        <input
          type="datetime-local"
          required
          value={recordedAt}
          onChange={(e) => setRecordedAt(e.target.value)}
          className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary md:w-64"
        />
      </label>

      <fieldset className="rounded border border-surface p-3">
        <legend className="px-1 text-xs font-medium text-muted">{t("bloodPressure")}</legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("systolic")}
            <input
              type="number"
              step="any"
              value={systolic}
              onChange={(e) => setSystolic(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("diastolic")}
            <input
              type="number"
              step="any"
              value={diastolic}
              onChange={(e) => setDiastolic(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("heartRate")}
          <input
            type="number"
            step="any"
            value={heartRate}
            onChange={(e) => setHeartRate(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          />
        </label>

        <div className="flex flex-col gap-1.5 text-sm text-muted">
          {t("temperature")}
          <div className="flex gap-2">
            <input
              type="number"
              step="any"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="w-full rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
            <select
              value={temperatureUnit}
              onChange={(e) => setTemperatureUnit(e.target.value as "°C" | "°F")}
              className="rounded border border-surface bg-white px-2 py-2.5 text-secondary"
            >
              <option value="°C">°C</option>
              <option value="°F">°F</option>
            </select>
          </div>
        </div>

        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("respiratoryRate")}
          <input
            type="number"
            step="any"
            value={respiratoryRate}
            onChange={(e) => setRespiratoryRate(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("spo2")}
          <input
            type="number"
            step="any"
            value={spo2}
            onChange={(e) => setSpo2(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          />
        </label>

        <div className="flex flex-col gap-1.5 text-sm text-muted">
          {t("weight")}
          <div className="flex gap-2">
            <input
              type="number"
              step="any"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
            <select
              value={weightUnit}
              onChange={(e) => setWeightUnit(e.target.value as "kg" | "lb")}
              className="rounded border border-surface bg-white px-2 py-2.5 text-secondary"
            >
              <option value="kg">kg</option>
              <option value="lb">lb</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 text-sm text-muted">
          {t("height")}
          <div className="flex gap-2">
            <input
              type="number"
              step="any"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="w-full rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
            <select
              value={heightUnit}
              onChange={(e) => setHeightUnit(e.target.value as "cm" | "in")}
              className="rounded border border-surface bg-white px-2 py-2.5 text-secondary"
            >
              <option value="cm">cm</option>
              <option value="in">in</option>
            </select>
          </div>
        </div>
      </div>

      {bmiPreview !== null && (
        <p className="text-sm text-muted">
          {t("bmiPreview")}: <span className="font-medium text-secondary">{bmiPreview} kg/m²</span>
        </p>
      )}

      <button type="button" onClick={() => setExpanded((v) => !v)} className="w-fit text-sm text-primary hover:underline">
        {expanded ? t("fewerDetails") : t("moreDetails")}
      </button>

      {expanded && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("source")}
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as VitalEntrySource)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            >
              <option value="manual">{t("sourceOptions.manual")}</option>
              <option value="medical_visit">{t("sourceOptions.medical_visit")}</option>
              <option value="imported">{t("sourceOptions.imported")}</option>
              <option value="other">{t("sourceOptions.other")}</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("relatedCondition")}
            <select
              value={relatedConditionId}
              onChange={(e) => setRelatedConditionId(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            >
              <option value="">{t("none")}</option>
              {conditions.map((condition) => (
                <option key={condition.id} value={condition.id}>
                  {condition.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("relatedAppointment")}
            <select
              value={relatedAppointmentId}
              onChange={(e) => setRelatedAppointmentId(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            >
              <option value="">{t("none")}</option>
              {appointments.map((appointment) => (
                <option key={appointment.id} value={appointment.id}>
                  {appointment.provider_name} — {new Date(appointment.date_time).toLocaleDateString(locale)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("sourceDocument")}
            <select
              value={sourceDocumentId}
              onChange={(e) => setSourceDocumentId(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            >
              <option value="">{t("none")}</option>
              {documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.name}
                </option>
              ))}
            </select>
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
        <button type="button" onClick={requestClose} className="rounded border border-surface px-4 py-2 text-sm text-secondary">
          {tCommon("cancel")}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {submitting ? t("saving") : tCommon("save")}
        </button>
      </div>
    </form>
  );
}
