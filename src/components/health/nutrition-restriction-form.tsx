"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Condition, NutritionRestriction } from "@/types/health/entities";
import type { RecordFormRenderProps } from "@/components/core/record-form-modal";

// Hosted inside RecordFormModal — see appointment-form.tsx for the
// pattern. Passing `restriction` switches to edit mode.
export function NutritionRestrictionForm({
  conditions,
  restriction: existingRestriction,
  closeAfterSave,
  requestClose,
  registerDirty,
}: {
  conditions: Condition[];
} & Partial<{ restriction: NutritionRestriction }> &
  RecordFormRenderProps) {
  const t = useTranslations("nutrition.restrictionForm");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [restriction, setRestriction] = useState(existingRestriction?.restriction ?? "");
  const [source, setSource] = useState<NutritionRestriction["source"]>(existingRestriction?.source ?? "clinician");
  const [relatedConditionId, setRelatedConditionId] = useState(existingRestriction?.related_condition_id ?? "");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fieldValues = { restriction, source, relatedConditionId };
  const initialSnapshot = useRef(JSON.stringify(fieldValues));
  useEffect(() => {
    registerDirty(JSON.stringify(fieldValues) !== initialSnapshot.current);
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!restriction.trim()) {
      setError(t("restrictionRequired"));
      return;
    }

    setSubmitting(true);

    const body = JSON.stringify({
      restriction: restriction.trim(),
      source,
      related_condition_id: relatedConditionId || undefined,
    });

    const response = existingRestriction
      ? await fetch(`/api/health/nutrition/restrictions/${existingRestriction.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body,
        })
      : await fetch("/api/health/nutrition/restrictions", {
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
          {t("restriction")}
          <input
            type="text"
            required
            value={restriction}
            onChange={(e) => setRestriction(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("source")}
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as NutritionRestriction["source"])}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          >
            <option value="clinician">{t("sourceOptions.clinician")}</option>
            <option value="self_reported">{t("sourceOptions.self_reported")}</option>
          </select>
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
