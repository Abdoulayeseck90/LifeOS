"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Business, Project, ProjectStatus } from "@/types/core/entities";
import type { RecordFormRenderProps } from "@/components/core/record-form-modal";
import { FormField } from "@/components/core/form/form-field";
import { LifeOSInput } from "@/components/core/form/lifeos-input";
import { LifeOSSelect } from "@/components/core/form/lifeos-select";
import { LifeOSTextarea } from "@/components/core/form/lifeos-textarea";
import { LifeOSFormActions } from "@/components/core/form/lifeos-form-actions";

const STATUSES: ProjectStatus[] = ["idea", "planning", "active", "completed", "archived"];

// Planning & Business spec, Section 5: there is no separate Ideas page —
// an idea is simply a Project with status "idea", the default for a new
// project. Section 13: Business is an optional picker here, never a
// separate "business project" entity.
export function ProjectForm({
  project,
  businesses,
  closeAfterSave,
  requestClose,
  registerDirty,
}: { project?: Project; businesses: Business[] } & RecordFormRenderProps) {
  const t = useTranslations("planning.projectForm");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "idea");
  const [priority, setPriority] = useState(project?.priority ?? "");
  const [startDate, setStartDate] = useState(project?.start_date ?? "");
  const [targetDate, setTargetDate] = useState(project?.target_date ?? "");
  const [category, setCategory] = useState(project?.category ?? "");
  const [businessId, setBusinessId] = useState(project?.business_id ?? "");
  const [notes, setNotes] = useState(project?.notes ?? "");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fieldValues = { name, description, status, priority, startDate, targetDate, category, businessId, notes };
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
      description: description.trim() || undefined,
      status,
      priority: priority || undefined,
      start_date: startDate || undefined,
      target_date: targetDate || undefined,
      category: category.trim() || undefined,
      business_id: businessId || undefined,
      notes: notes.trim() || undefined,
    });

    const response = project
      ? await fetch(`/api/planning/projects/${project.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body })
      : await fetch("/api/planning/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body });

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

      <FormField label={t("name")} htmlFor="project-name" required>
        <LifeOSInput id="project-name" type="text" required value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>

      <FormField label={t("description")} htmlFor="project-description" optional>
        <LifeOSTextarea id="project-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("status")} htmlFor="project-status">
          <LifeOSSelect id="project-status" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`statusOptions.${s}`)}
              </option>
            ))}
          </LifeOSSelect>
        </FormField>

        <FormField label={t("priority")} htmlFor="project-priority" optional>
          <LifeOSSelect id="project-priority" value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}>
            <option value="">—</option>
            <option value="low">{t("priorityOptions.low")}</option>
            <option value="medium">{t("priorityOptions.medium")}</option>
            <option value="high">{t("priorityOptions.high")}</option>
          </LifeOSSelect>
        </FormField>

        <FormField label={t("startDate")} htmlFor="project-start-date" optional>
          <LifeOSInput id="project-start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </FormField>

        <FormField label={t("dueDate")} htmlFor="project-due-date" optional>
          <LifeOSInput id="project-due-date" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </FormField>

        <FormField label={t("category")} htmlFor="project-category" optional>
          <LifeOSInput id="project-category" type="text" value={category} onChange={(e) => setCategory(e.target.value)} />
        </FormField>

        <FormField label={t("business")} htmlFor="project-business" optional helperText={t("businessHelper")}>
          <LifeOSSelect id="project-business" value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
            <option value="">{tCommon("none")}</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </LifeOSSelect>
        </FormField>
      </div>

      <FormField label={t("notes")} htmlFor="project-notes" optional>
        <LifeOSTextarea id="project-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </FormField>

      <LifeOSFormActions onCancel={requestClose} submitting={submitting} submitLabel={tCommon("save")} />
    </form>
  );
}
