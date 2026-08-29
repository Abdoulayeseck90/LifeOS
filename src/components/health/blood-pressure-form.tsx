"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Vital, BloodPressurePosition, BloodPressureArm } from "@/types/health/entities";
import type { RecordFormRenderProps } from "@/components/core/record-form-modal";
import { markVitalSaved } from "@/components/health/vital-saved-banner";

function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Hosted inside RecordFormModal — see body-metric-form.tsx for the
// pattern. Passing `reading` switches to edit mode. Position/arm/notes
// are optional per spec, so they live behind the same "more details"
// disclosure body-metric-form uses for its own optional fields.
export function BloodPressureForm({
  reading,
  closeAfterSave,
  requestClose,
  registerDirty,
}: Partial<{ reading: Vital }> & RecordFormRenderProps) {
  const t = useTranslations("vitals.bloodPressure.form");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [systolic, setSystolic] = useState(reading?.systolic?.toString() ?? "");
  const [diastolic, setDiastolic] = useState(reading?.diastolic?.toString() ?? "");
  const [pulse, setPulse] = useState(reading?.pulse?.toString() ?? "");
  const [recordedAt, setRecordedAt] = useState(
    reading ? toDatetimeLocalValue(reading.recorded_at) : new Date().toISOString().slice(0, 16)
  );
  const [position, setPosition] = useState<BloodPressurePosition | "">(reading?.position ?? "");
  const [arm, setArm] = useState<BloodPressureArm | "">(reading?.arm ?? "");
  const [notes, setNotes] = useState(reading?.notes ?? "");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fieldValues = { systolic, diastolic, pulse, recordedAt, position, arm, notes };
  const initialSnapshot = useRef(JSON.stringify(fieldValues));
  useEffect(() => {
    registerDirty(JSON.stringify(fieldValues) !== initialSnapshot.current);
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const systolicValue = Number(systolic);
    const diastolicValue = Number(diastolic);
    const pulseValue = Number(pulse);
    if (
      !systolic.trim() ||
      !diastolic.trim() ||
      !pulse.trim() ||
      !Number.isFinite(systolicValue) ||
      !Number.isFinite(diastolicValue) ||
      !Number.isFinite(pulseValue)
    ) {
      setError(t("valueRequired"));
      return;
    }

    setSubmitting(true);

    const body = JSON.stringify({
      vital_type: "blood_pressure",
      systolic: systolicValue,
      diastolic: diastolicValue,
      pulse: pulseValue,
      recorded_at: new Date(recordedAt).toISOString(),
      position: position || undefined,
      arm: arm || undefined,
      notes: notes.trim() || undefined,
    });

    const response = reading
      ? await fetch(`/api/health/vitals/${reading.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body,
        })
      : await fetch("/api/health/vitals", {
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <p className="text-sm text-status-urgent">{error}</p>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("systolic")}
          <input
            type="number"
            step="any"
            required
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
            required
            value={diastolic}
            onChange={(e) => setDiastolic(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("pulse")}
          <input
            type="number"
            step="any"
            required
            value={pulse}
            onChange={(e) => setPulse(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm text-muted">
        {t("recordedAt")}
        <input
          type="datetime-local"
          required
          value={recordedAt}
          onChange={(e) => setRecordedAt(e.target.value)}
          className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary md:w-64"
        />
      </label>

      <button type="button" onClick={() => setExpanded((v) => !v)} className="w-fit text-sm text-primary hover:underline">
        {expanded ? t("fewerDetails") : t("moreDetails")}
      </button>

      {expanded && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("position")}
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value as BloodPressurePosition | "")}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            >
              <option value="">{t("positionNone")}</option>
              <option value="sitting">{t("positionOptions.sitting")}</option>
              <option value="standing">{t("positionOptions.standing")}</option>
              <option value="lying">{t("positionOptions.lying")}</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("arm")}
            <select
              value={arm}
              onChange={(e) => setArm(e.target.value as BloodPressureArm | "")}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            >
              <option value="">{t("armNone")}</option>
              <option value="left">{t("armOptions.left")}</option>
              <option value="right">{t("armOptions.right")}</option>
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
          {tCommon("save")}
        </button>
      </div>
    </form>
  );
}
