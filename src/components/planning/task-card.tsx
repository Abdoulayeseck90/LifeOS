"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import type { Business, Goal, Project } from "@/types/core/entities";
import type { OfflineTask } from "@/lib/offline/db";
import { TaskStatusBadge } from "@/components/planning/task-status-badge";
import { TaskForm } from "@/components/planning/task-form";
import { RecordFormModal } from "@/components/core/record-form-modal";
import { ConfirmDialog } from "@/components/core/confirm-dialog";
import { PendingSyncBadge } from "@/components/core/pending-sync-badge";
import { attemptFetch } from "@/lib/offline/attempt-fetch";
import { getDB } from "@/lib/offline/db";
import { enqueue, SYNC_UPDATED_EVENT } from "@/lib/offline/sync-queue";

// Planning & Business spec, Section 8: "Tasks should be easy to
// complete with one tap" — the checkbox PATCHes status directly, no
// modal, no confirmation. Toggles only between open <-> done; editing
// to "in_progress" or "cancelled" still goes through the full form.
export function TaskCard({
  task,
  projects,
  goals,
  businesses,
}: {
  task: OfflineTask;
  projects: Project[];
  goals: Goal[];
  businesses: Business[];
}) {
  const t = useTranslations("planning.tasks");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [toggling, setToggling] = useState(false);

  const project = projects.find((p) => p.id === task.project_id);
  const goal = goals.find((g) => g.id === task.goal_id);
  const business = businesses.find((b) => b.id === task.business_id);
  const isDone = task.status === "done";

  async function toggleDone() {
    setToggling(true);
    const nextStatus = isDone ? "open" : "done";
    const body = { status: nextStatus };

    const attempt = await attemptFetch(`/api/planning/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (attempt.networkFailure) {
      const db = await getDB();
      await db.put("tasks", { ...task, status: nextStatus, _pendingSync: true }, task.id);
      await enqueue({ feature: "task", operation: "update", entityId: task.id, payload: body });
      setToggling(false);
      window.dispatchEvent(new Event(SYNC_UPDATED_EVENT));
      return;
    }

    setToggling(false);
    router.refresh();
  }

  async function handleDelete() {
    const response = await fetch(`/api/planning/tasks/${task.id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  }

  return (
    <div className="flex items-start gap-3 rounded-card border border-surface bg-white p-4">
      <button
        type="button"
        onClick={toggleDone}
        disabled={toggling}
        aria-pressed={isDone}
        aria-label={t("toggleComplete")}
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          isDone ? "border-primary bg-primary text-primary-foreground" : "border-slate-300 text-transparent hover:border-primary"
        }`}
      >
        <Check size={14} />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <p className={`font-medium ${isDone ? "text-muted line-through" : "text-secondary"}`}>{task.title}</p>
            {task._pendingSync && <PendingSyncBadge />}
          </div>
          <TaskStatusBadge status={task.status} />
        </div>

        {(project || goal || business) && (
          <p className="mt-0.5 text-xs text-muted">{[project?.name, goal?.title, business?.name].filter(Boolean).join(" · ")}</p>
        )}

        {task.description && <p className="mt-1 text-sm text-muted">{task.description}</p>}

        {task.due_date && (
          <p className="mt-1 text-xs text-muted">
            {t("dueDate")}: {task.due_date}
          </p>
        )}

        <div className="mt-2 flex gap-4">
          <RecordFormModal
            trigger={(open) => (
              <button type="button" onClick={open} className="text-xs text-primary hover:underline">
                {tCommon("edit")}
              </button>
            )}
            modalTitle={t("editTitle")}
          >
            {(modalProps) => <TaskForm task={task} projects={projects} goals={goals} businesses={businesses} {...modalProps} />}
          </RecordFormModal>
          <ConfirmDialog
            trigger={(open) => (
              <button type="button" onClick={open} className="text-xs text-status-urgent hover:underline">
                {tCommon("delete")}
              </button>
            )}
            title={t("deleteConfirmTitle")}
            description={t("deleteConfirmMessage")}
            onConfirm={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}
