"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Vital } from "@/types/health/entities";
import type { RecordFormRenderProps } from "@/components/core/record-form-modal";
import { SINGLE_VALUE_FIELD_KEY, SINGLE_VALUE_DEFAULT_UNIT, type SingleValueVitalType } from "@/components/health/vital-type-config";
import { markVitalSaved } from "@/components/health/vital-saved-banner";

function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Generic create/edit form for the four "single value" vital types
// (heart_rate/spo2/temperature/respiratory_rate) — one component instead
// of four near-identical ones, since they only differ in which column
// the value is stored under (see vital-type-config.tsx) and their
// default unit. Mirrors body-metric-form.tsx / blood-pressure-form.tsx.
export function VitalSingleValueForm({
  vitalType,
  reading,
  closeAfterSave,
  requestClose,
  registerDirty,
}: { vitalType: SingleValueVitalType; reading?: Vital } & RecordFormRenderProps) {
  const t = useTranslations("vitals");
  const tType = useTranslations(`vitals.types.${vitalType}`);
  const tCommon = useTranslations("common");
  const router = useRouter();

  const fieldKey = SINGLE_VALUE_FIELD_KEY[vitalType];
  const existingValue = reading ? (fieldKey === "pulse" ? reading.pulse : reading.value) : null;

  const [value, setValue] = useState(existingValue?.toString() ?? "");
  // Unit isn't user-editable for these types (unlike weight/height,
  // where different scales are genuinely common) — always the type's
  // fixed unit, or whatever an existing reading already has on edit.
  const unit = reading?.unit ?? SINGLE_VALUE_DEFAULT_UNIT[vitalType];
  const [recordedAt, setRecordedAt] = useState(
    reading ? toDatetimeLocalValue(reading.recorded_at) : new Date().toISOString().slice(0, 16)
  );
  const [notes, setNotes] = useState(reading?.notes ?? "");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fieldValues = { value, unit, recordedAt, notes };
  const initialSnapshot = useRef(JSON.stringify(fieldValues));
  useEffect(() => {
    registerDirty(JSON.stringify(fieldValues) !== initialSnapshot.current);
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const numericValue = Number(value);
    if (!value.trim() || !Number.isFinite(numericValue)) {
      setError(t("form.valueRequired"));
      return;
    }

    setSubmitting(true);

    const body = JSON.stringify({
      vital_type: vitalType,
      [fieldKey]: numericValue,
      unit: unit.trim() || undefined,
      recorded_at: new Date(recordedAt).toISOString(),
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
      setError(t("form.saveError"));
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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {tType("formLabel")}
          <input
            type="number"
            step="any"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("form.recordedAt")}
          <input
            type="datetime-local"
            required
            value={recordedAt}
            onChange={(e) => setRecordedAt(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm text-muted">
        {t("form.notes")}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
        />
      </label>

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
