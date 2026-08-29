"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Condition, SymptomEntry } from "@/types/health/entities";
import type { RecordFormRenderProps } from "@/components/core/record-form-modal";

// Hosted inside RecordFormModal — see appointment-form.tsx for the
// pattern. Passing `symptomEntry` switches to edit mode.
export function SymptomForm({
  conditions,
  symptomEntry,
  closeAfterSave,
  requestClose,
  registerDirty,
}: {
  conditions: Condition[];
} & Partial<{ symptomEntry: SymptomEntry }> &
  RecordFormRenderProps) {
  const t = useTranslations("symptoms.form");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [symptom, setSymptom] = useState(symptomEntry?.symptom ?? "");
  const [severity, setSeverity] = useState(symptomEntry?.severity?.toString() ?? "");
  const [onset, setOnset] = useState(symptomEntry?.onset ?? "");
  const [duration, setDuration] = useState(symptomEntry?.duration ?? "");
  const [frequency, setFrequency] = useState(symptomEntry?.frequency ?? "");
  const [context, setContext] = useState(symptomEntry?.context ?? "");
  const [relatedConditionId, setRelatedConditionId] = useState(symptomEntry?.related_condition_id ?? "");
  const [notes, setNotes] = useState(symptomEntry?.notes ?? "");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fieldValues = { symptom, severity, onset, duration, frequency, context, relatedConditionId, notes };
  const initialSnapshot = useRef(JSON.stringify(fieldValues));
  useEffect(() => {
    registerDirty(JSON.stringify(fieldValues) !== initialSnapshot.current);
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!symptom.trim()) {
      setError(t("symptomRequired"));
      return;
    }

    setSubmitting(true);

    const body = JSON.stringify({
      symptom: symptom.trim(),
      severity: severity ? Number(severity) : undefined,
      onset: onset.trim() || undefined,
      duration: duration.trim() || undefined,
      frequency: frequency.trim() || undefined,
      context: context.trim() || undefined,
      related_condition_id: relatedConditionId || undefined,
      notes: notes.trim() || undefined,
    });

    const response = symptomEntry
      ? await fetch(`/api/health/symptoms/${symptomEntry.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body,
        })
      : await fetch("/api/health/symptoms", {
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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm text-muted md:col-span-2">
          {t("symptom")}
          <input
            type="text"
            required
            value={symptom}
            onChange={(e) => setSymptom(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("severity")}
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          >
            <option value="">{t("severityUnset")}</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("onset")}
            <input
              type="text"
              value={onset}
              onChange={(e) => setOnset(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("duration")}
            <input
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("frequency")}
            <input
              type="text"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
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
            {t("context")}
            <input
              type="text"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted md:col-span-3">
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
