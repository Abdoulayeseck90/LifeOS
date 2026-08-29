"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Business, Goal, GoalStatus, Project } from "@/types/core/entities";
import type { RecordFormRenderProps } from "@/components/core/record-form-modal";
import { FormField } from "@/components/core/form/form-field";
import { LifeOSInput } from "@/components/core/form/lifeos-input";
import { LifeOSSelect } from "@/components/core/form/lifeos-select";
import { LifeOSTextarea } from "@/components/core/form/lifeos-textarea";
import { LifeOSFormActions } from "@/components/core/form/lifeos-form-actions";

const STATUSES: GoalStatus[] = ["not_started", "in_progress", "completed", "archived"];

export function GoalForm({
  goal,
  projects,
  businesses,
  defaultProjectId,
  defaultBusinessId,
  closeAfterSave,
  requestClose,
  registerDirty,
}: {
  goal?: Goal;
  projects: Project[];
  businesses: Business[];
  defaultProjectId?: string;
  defaultBusinessId?: string;
} & RecordFormRenderProps) {
  const t = useTranslations("planning.goalForm");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [title, setTitle] = useState(goal?.title ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [status, setStatus] = useState<GoalStatus>(goal?.status ?? "not_started");
  const [category, setCategory] = useState(goal?.category ?? "");
  const [targetDate, setTargetDate] = useState(goal?.target_date ?? "");
  const [progress, setProgress] = useState(String(goal?.progress ?? 0));
  const [projectId, setProjectId] = useState(goal?.project_id ?? defaultProjectId ?? "");
  const [businessId, setBusinessId] = useState(goal?.business_id ?? defaultBusinessId ?? "");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fieldValues = { title, description, status, category, targetDate, progress, projectId, businessId };
  const initialSnapshot = useRef(JSON.stringify(fieldValues));
  useEffect(() => {
    registerDirty(JSON.stringify(fieldValues) !== initialSnapshot.current);
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError(t("titleRequired"));
      return;
    }

    setSubmitting(true);

    const body = JSON.stringify({
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      category: category.trim() || undefined,
      target_date: targetDate || undefined,
      progress: progress ? Number(progress) : undefined,
      project_id: projectId || undefined,
      business_id: businessId || undefined,
    });

    const response = goal
      ? await fetch(`/api/planning/goals/${goal.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body })
      : await fetch("/api/planning/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body });

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <p className="text-sm text-status-urgent">{error}</p>}

      <FormField label={t("title")} htmlFor="goal-title" required>
        <LifeOSInput id="goal-title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("titlePlaceholder")} />
      </FormField>

      <FormField label={t("description")} htmlFor="goal-description" optional>
        <LifeOSTextarea id="goal-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("status")} htmlFor="goal-status">
          <LifeOSSelect id="goal-status" value={status} onChange={(e) => setStatus(e.target.value as GoalStatus)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`statusOptions.${s}`)}
              </option>
            ))}
          </LifeOSSelect>
        </FormField>

        <FormField label={t("progress")} htmlFor="goal-progress" optional helperText={t("progressHelper")}>
          <LifeOSInput id="goal-progress" type="number" min={0} max={100} step={5} value={progress} onChange={(e) => setProgress(e.target.value)} />
        </FormField>

        <FormField label={t("category")} htmlFor="goal-category" optional>
          <LifeOSInput id="goal-category" type="text" value={category} onChange={(e) => setCategory(e.target.value)} />
        </FormField>

        <FormField label={t("targetDate")} htmlFor="goal-target-date" optional>
          <LifeOSInput id="goal-target-date" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </FormField>

        <FormField label={t("relatedProject")} htmlFor="goal-project" optional>
          <LifeOSSelect id="goal-project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">{tCommon("none")}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </LifeOSSelect>
        </FormField>

        <FormField label={t("relatedBusiness")} htmlFor="goal-business" optional>
          <LifeOSSelect id="goal-business" value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
            <option value="">{tCommon("none")}</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </LifeOSSelect>
        </FormField>
      </div>

      <LifeOSFormActions onCancel={requestClose} submitting={submitting} submitLabel={tCommon("save")} />
    </form>
  );
}
