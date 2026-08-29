"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { BodyMetric, BodyMetricType } from "@/types/health/entities";
import type { RecordFormRenderProps } from "@/components/core/record-form-modal";
import { markVitalSaved } from "@/components/health/vital-saved-banner";

const DEFAULT_UNITS: Record<BodyMetricType, string> = {
  weight: "kg",
  height: "cm",
  bmi: "",
  waist_circumference: "cm",
  body_fat_percentage: "%",
};

function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Hosted inside RecordFormModal — see appointment-form.tsx for the
// pattern. Passing `bodyMetric` switches to edit mode. `initialMetricType`
// lets the unified "+ Record Vital" flow (vital-record-form.tsx) open
// this already set to Weight/Height/BMI without the user having to
// re-select it from the dropdown below.
export function BodyMetricForm({
  bodyMetric,
  initialMetricType,
  closeAfterSave,
  requestClose,
  registerDirty,
}: Partial<{ bodyMetric: BodyMetric; initialMetricType: BodyMetricType }> & RecordFormRenderProps) {
  const t = useTranslations("weight.form");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [metricType, setMetricType] = useState<BodyMetricType>(bodyMetric?.metric_type ?? initialMetricType ?? "weight");
  const [value, setValue] = useState(bodyMetric?.value?.toString() ?? "");
  const [unit, setUnit] = useState(bodyMetric?.unit ?? DEFAULT_UNITS[initialMetricType ?? "weight"]);
  const [measuredAt, setMeasuredAt] = useState(
    bodyMetric ? toDatetimeLocalValue(bodyMetric.measured_at) : new Date().toISOString().slice(0, 16)
  );
  const [source, setSource] = useState(bodyMetric?.source ?? "");
  const [notes, setNotes] = useState(bodyMetric?.notes ?? "");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fieldValues = { metricType, value, unit, measuredAt, source, notes };
  const initialSnapshot = useRef(JSON.stringify(fieldValues));
  useEffect(() => {
    registerDirty(JSON.stringify(fieldValues) !== initialSnapshot.current);
  });

  function handleMetricTypeChange(next: BodyMetricType) {
    setMetricType(next);
    setUnit(DEFAULT_UNITS[next]);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const numericValue = Number(value);
    if (!value.trim() || !Number.isFinite(numericValue)) {
      setError(t("valueRequired"));
      return;
    }
    if (!unit.trim()) {
      setError(t("unitRequired"));
      return;
    }

    setSubmitting(true);

    const body = JSON.stringify({
      metric_type: metricType,
      value: numericValue,
      unit: unit.trim(),
      measured_at: measuredAt,
      source: source.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    const response = bodyMetric
      ? await fetch(`/api/health/weight/${bodyMetric.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body,
        })
      : await fetch("/api/health/weight", {
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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("metricType")}
          <select
            value={metricType}
            onChange={(e) => handleMetricTypeChange(e.target.value as BodyMetricType)}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          >
            <option value="weight">{t("metricTypeOptions.weight")}</option>
            <option value="height">{t("metricTypeOptions.height")}</option>
            <option value="bmi">{t("metricTypeOptions.bmi")}</option>
            <option value="waist_circumference">{t("metricTypeOptions.waist_circumference")}</option>
            <option value="body_fat_percentage">{t("metricTypeOptions.body_fat_percentage")}</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("value")}
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
          {t("unit")}
          <input
            type="text"
            required
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("measuredAt")}
          <input
            type="datetime-local"
            required
            value={measuredAt}
            onChange={(e) => setMeasuredAt(e.target.value)}
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
            {t("source")}
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted">
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
