"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Condition } from "@/types/health/entities";
import type { RecordFormRenderProps } from "@/components/core/record-form-modal";

// Hosted inside RecordFormModal — see appointment-form.tsx for the
// pattern. Passing `condition` switches to edit mode.
export function ConditionForm({
  condition,
  closeAfterSave,
  requestClose,
  registerDirty,
}: Partial<{ condition: Condition }> & RecordFormRenderProps) {
  const t = useTranslations("conditions.form");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [name, setName] = useState(condition?.name ?? "");
  const [status, setStatus] = useState<Condition["status"]>(condition?.status ?? "active");
  const [diagnosisDate, setDiagnosisDate] = useState(condition?.diagnosis_date ?? "");
  const [description, setDescription] = useState(condition?.description ?? "");
  const [providerReference, setProviderReference] = useState(condition?.provider_reference ?? "");
  const [notes, setNotes] = useState(condition?.notes ?? "");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fieldValues = { name, status, diagnosisDate, description, providerReference, notes };
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
      diagnosis_date: diagnosisDate || undefined,
      description: description.trim() || undefined,
      provider_reference: providerReference.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    const response = condition
      ? await fetch(`/api/health/conditions/${condition.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body,
        })
      : await fetch("/api/health/conditions", {
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
            onChange={(e) => setStatus(e.target.value as Condition["status"])}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          >
            <option value="active">{t("statusOptions.active")}</option>
            <option value="monitoring">{t("statusOptions.monitoring")}</option>
            <option value="resolved">{t("statusOptions.resolved")}</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("diagnosisDate")}
          <input
            type="date"
            value={diagnosisDate}
            onChange={(e) => setDiagnosisDate(e.target.value)}
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm text-muted md:col-span-3">
            {t("description")}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("providerReference")}
            <input
              type="text"
              value={providerReference}
              onChange={(e) => setProviderReference(e.target.value)}
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
