"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Condition, Medication } from "@/types/health/entities";
import type { RecordFormRenderProps } from "@/components/core/record-form-modal";

// Hosted inside RecordFormModal — see appointment-form.tsx for the
// pattern. Passing `medication` switches to edit mode.
export function MedicationForm({
  conditions,
  medication,
  closeAfterSave,
  requestClose,
  registerDirty,
}: {
  conditions: Condition[];
} & Partial<{ medication: Medication }> &
  RecordFormRenderProps) {
  const t = useTranslations("medications.form");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [name, setName] = useState(medication?.name ?? "");
  const [status, setStatus] = useState<Medication["status"]>(medication?.status ?? "active");
  const [dose, setDose] = useState(medication?.dose ?? "");
  const [unit, setUnit] = useState(medication?.unit ?? "");
  const [frequency, setFrequency] = useState(medication?.frequency ?? "");
  const [route, setRoute] = useState(medication?.route ?? "");
  const [startDate, setStartDate] = useState(medication?.start_date ?? "");
  const [relatedConditionId, setRelatedConditionId] = useState(medication?.related_condition_id ?? "");
  const [endDate, setEndDate] = useState(medication?.end_date ?? "");
  const [prescriber, setPrescriber] = useState(medication?.prescriber ?? "");
  const [reason, setReason] = useState(medication?.reason ?? "");
  const [instructions, setInstructions] = useState(medication?.instructions ?? "");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fieldValues = {
    name,
    status,
    dose,
    unit,
    frequency,
    route,
    startDate,
    relatedConditionId,
    endDate,
    prescriber,
    reason,
    instructions,
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

    setSubmitting(true);

    const body = JSON.stringify({
      name: name.trim(),
      status,
      dose: dose.trim() || undefined,
      unit: unit.trim() || undefined,
      frequency: frequency.trim() || undefined,
      route: route.trim() || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      related_condition_id: relatedConditionId || undefined,
      prescriber: prescriber.trim() || undefined,
      reason: reason.trim() || undefined,
      instructions: instructions.trim() || undefined,
    });

    const response = medication
      ? await fetch(`/api/health/medications/${medication.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body,
        })
      : await fetch("/api/health/medications", {
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
        <label className="flex flex-col gap-1.5 text-sm text-muted md:col-span-2">
          {t("name")}
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("status")}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Medication["status"])}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          >
            <option value="active">{t("statusOptions.active")}</option>
            <option value="planned">{t("statusOptions.planned")}</option>
            <option value="discontinued">{t("statusOptions.discontinued")}</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("dose")}
          <input
            type="text"
            value={dose}
            onChange={(e) => setDose(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("unit")}
          <input
            type="text"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
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
          {t("route")}
          <input
            type="text"
            value={route}
            onChange={(e) => setRoute(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("startDate")}
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
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
            {t("endDate")}
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("prescriber")}
            <input
              type="text"
              value={prescriber}
              onChange={(e) => setPrescriber(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted md:col-span-2">
            {t("reason")}
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted md:col-span-2">
            {t("instructions")}
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
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
