"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Business, Goal, Project, TaskRecord, TaskStatus } from "@/types/core/entities";
import type { RecordFormRenderProps } from "@/components/core/record-form-modal";
import { FormField } from "@/components/core/form/form-field";
import { LifeOSInput } from "@/components/core/form/lifeos-input";
import { LifeOSSelect } from "@/components/core/form/lifeos-select";
import { LifeOSTextarea } from "@/components/core/form/lifeos-textarea";
import { LifeOSFormActions } from "@/components/core/form/lifeos-form-actions";
import { attemptFetch } from "@/lib/offline/attempt-fetch";
import { getDB } from "@/lib/offline/db";
import { enqueue, SYNC_UPDATED_EVENT } from "@/lib/offline/sync-queue";

// Planning & Business spec, Section 8: only 3 statuses are ever offered
// here (To Do/In Progress/Completed) even though the DB keeps a 4th
// "cancelled" value for flexibility — see TaskStatus's comment in
// types/core/entities.ts.
const FORM_STATUSES: TaskStatus[] = ["open", "in_progress", "done"];

export function TaskForm({
  task,
  projects,
  goals,
  businesses,
  defaultProjectId,
  defaultGoalId,
  defaultBusinessId,
  closeAfterSave,
  requestClose,
  registerDirty,
}: {
  task?: TaskRecord;
  projects: Project[];
  goals: Goal[];
  businesses: Business[];
  defaultProjectId?: string;
  defaultGoalId?: string;
  defaultBusinessId?: string;
} & RecordFormRenderProps) {
  const t = useTranslations("planning.taskForm");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "open");
  const [priority, setPriority] = useState(task?.priority ?? "");
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");
  const [projectId, setProjectId] = useState(task?.project_id ?? defaultProjectId ?? "");
  const [goalId, setGoalId] = useState(task?.goal_id ?? defaultGoalId ?? "");
  const [businessId, setBusinessId] = useState(task?.business_id ?? defaultBusinessId ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fieldValues = { title, description, status, priority, dueDate, projectId, goalId, businessId, notes };
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

    const bodyObject = {
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority: priority || undefined,
      due_date: dueDate || undefined,
      project_id: projectId || undefined,
      goal_id: goalId || undefined,
      business_id: businessId || undefined,
      notes: notes.trim() || undefined,
    };
    const body = JSON.stringify(bodyObject);

    const attempt = task
      ? await attemptFetch(`/api/planning/tasks/${task.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body })
      : await attemptFetch("/api/planning/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body });

    if (attempt.networkFailure) {
      const db = await getDB();
      const localId = task?.id ?? crypto.randomUUID();
      const localTask: TaskRecord = {
        id: localId,
        user_id: task?.user_id ?? "",
        title: bodyObject.title,
        description: bodyObject.description ?? null,
        status: bodyObject.status,
        priority: (bodyObject.priority as TaskRecord["priority"]) ?? null,
        due_date: bodyObject.due_date ?? null,
        project_id: bodyObject.project_id ?? null,
        goal_id: bodyObject.goal_id ?? null,
        business_id: bodyObject.business_id ?? null,
        domain: task?.domain ?? null,
        related_entity_type: task?.related_entity_type ?? null,
        related_entity_id: task?.related_entity_id ?? null,
        notes: bodyObject.notes ?? null,
        created_at: task?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.put("tasks", { ...localTask, _pendingSync: true }, localId);
      await enqueue({
        feature: "task",
        operation: task ? "update" : "create",
        entityId: localId,
        payload: bodyObject,
      });

      setSubmitting(false);
      registerDirty(false);
      closeAfterSave();
      window.dispatchEvent(new Event(SYNC_UPDATED_EVENT));
      return;
    }

    setSubmitting(false);

    if (!attempt.response.ok) {
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

      <FormField label={t("title")} htmlFor="task-title" required>
        <LifeOSInput id="task-title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)} />
      </FormField>

      <FormField label={t("description")} htmlFor="task-description" optional>
        <LifeOSTextarea id="task-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("status")} htmlFor="task-status">
          <LifeOSSelect id="task-status" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
            {FORM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`statusOptions.${s}`)}
              </option>
            ))}
          </LifeOSSelect>
        </FormField>

        <FormField label={t("priority")} htmlFor="task-priority" optional>
          <LifeOSSelect id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}>
            <option value="">—</option>
            <option value="low">{t("priorityOptions.low")}</option>
            <option value="medium">{t("priorityOptions.medium")}</option>
            <option value="high">{t("priorityOptions.high")}</option>
          </LifeOSSelect>
        </FormField>

        <FormField label={t("dueDate")} htmlFor="task-due-date" optional>
          <LifeOSInput id="task-due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </FormField>

        <FormField label={t("project")} htmlFor="task-project" optional>
          <LifeOSSelect id="task-project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">{tCommon("none")}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </LifeOSSelect>
        </FormField>

        <FormField label={t("goal")} htmlFor="task-goal" optional>
          <LifeOSSelect id="task-goal" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
            <option value="">{tCommon("none")}</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </LifeOSSelect>
        </FormField>

        <FormField label={t("business")} htmlFor="task-business" optional>
          <LifeOSSelect id="task-business" value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
            <option value="">{tCommon("none")}</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </LifeOSSelect>
        </FormField>
      </div>

      <FormField label={t("notes")} htmlFor="task-notes" optional>
        <LifeOSTextarea id="task-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </FormField>

      <LifeOSFormActions onCancel={requestClose} submitting={submitting} submitLabel={tCommon("save")} />
    </form>
  );
}
