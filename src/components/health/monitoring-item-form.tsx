"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Guideline, MonitoringIntervalUnit, MonitoringSource } from "@/types/health/entities";
import type { RecordFormRenderProps } from "@/components/core/record-form-modal";

// Hosted inside RecordFormModal — see appointment-form.tsx for the
// pattern. Create-only (see the delete-only [id] route note — items are
// "edited" via the dedicated complete/next-due actions instead).
export function MonitoringItemForm({
  planId,
  guidelines,
  closeAfterSave,
  requestClose,
  registerDirty,
}: { planId: string; guidelines: Guideline[] } & RecordFormRenderProps) {
  const t = useTranslations("monitoring.itemForm");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [testType, setTestType] = useState("");
  const [intervalUnit, setIntervalUnit] = useState<MonitoringIntervalUnit | "">("");
  const [intervalValue, setIntervalValue] = useState("");
  const [frequencyNote, setFrequencyNote] = useState("");
  const [nextDueAt, setNextDueAt] = useState("");
  const [source, setSource] = useState<MonitoringSource>("user");
  const [guidelineId, setGuidelineId] = useState("");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fieldValues = {
    name,
    category,
    testType,
    intervalUnit,
    intervalValue,
    frequencyNote,
    nextDueAt,
    source,
    guidelineId,
    notes,
  };
  const initialSnapshot = useRef(JSON.stringify(fieldValues));
  useEffect(() => {
    registerDirty(JSON.stringify(fieldValues) !== initialSnapshot.current);
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(t("nameRequired"));
      return;
    }
    if (intervalUnit && !intervalValue) {
      setError(t("intervalValueRequired"));
      return;
    }

    setSubmitting(true);

    const response = await fetch("/api/health/monitoring/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        monitoring_plan_id: planId,
        name: name.trim(),
        category: category.trim() || undefined,
        test_type: testType.trim() || undefined,
        interval_value: intervalUnit ? Number(intervalValue) : undefined,
        interval_unit: intervalUnit || undefined,
        frequency_note: frequencyNote.trim() || undefined,
        next_due_at: nextDueAt || undefined,
        source,
        guideline_id: guidelineId || undefined,
        notes: notes.trim() || undefined,
      }),
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
        <label className="flex flex-col gap-1.5 text-sm text-muted md:col-span-2">
          {t("name")}
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("source")}
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as MonitoringSource)}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          >
            <option value="user">{t("sourceOptions.user")}</option>
            <option value="clinician">{t("sourceOptions.clinician")}</option>
            <option value="guideline">{t("sourceOptions.guideline")}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("nextDueAt")}
          <input
            type="date"
            value={nextDueAt}
            onChange={(e) => setNextDueAt(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("intervalUnit")}
          <select
            value={intervalUnit}
            onChange={(e) => setIntervalUnit(e.target.value as MonitoringIntervalUnit | "")}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          >
            <option value="">{t("noFixedInterval")}</option>
            <option value="days">{t("intervalUnitOptions.days")}</option>
            <option value="weeks">{t("intervalUnitOptions.weeks")}</option>
            <option value="months">{t("intervalUnitOptions.months")}</option>
            <option value="years">{t("intervalUnitOptions.years")}</option>
          </select>
        </label>
        {intervalUnit ? (
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("intervalValue")}
            <input
              type="number"
              min={1}
              value={intervalValue}
              onChange={(e) => setIntervalValue(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
        ) : (
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("frequencyNote")}
            <input
              type="text"
              value={frequencyNote}
              onChange={(e) => setFrequencyNote(e.target.value)}
              placeholder={t("frequencyNotePlaceholder")}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
        )}
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
            {t("category")}
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("testType")}
            <input
              type="text"
              value={testType}
              onChange={(e) => setTestType(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
          {guidelines.length > 0 && (
            <label className="flex flex-col gap-1.5 text-sm text-muted md:col-span-2">
              {t("guideline")}
              <select
                value={guidelineId}
                onChange={(e) => setGuidelineId(e.target.value)}
                className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
              >
                <option value="">{t("none")}</option>
                {guidelines.map((guideline) => (
                  <option key={guideline.id} value={guideline.id}>
                    {guideline.organization} — {guideline.title}
                    {guideline.publication_year ? ` (${guideline.publication_year})` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1.5 text-sm text-muted md:col-span-2">
            {t("notes")}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={t("notesPlaceholder")}
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
