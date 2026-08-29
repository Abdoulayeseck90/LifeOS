"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Business, Goal, Project } from "@/types/core/entities";
import { GoalStatusBadge } from "@/components/planning/goal-status-badge";
import { GoalForm } from "@/components/planning/goal-form";
import { ProgressBar } from "@/components/core/progress-bar";
import { RecordFormModal } from "@/components/core/record-form-modal";
import { ConfirmDialog } from "@/components/core/confirm-dialog";

export function GoalCard({ goal, projects, businesses }: { goal: Goal; projects: Project[]; businesses: Business[] }) {
  const t = useTranslations("planning.goals");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const project = projects.find((p) => p.id === goal.project_id);
  const business = businesses.find((b) => b.id === goal.business_id);

  async function handleDelete() {
    const response = await fetch(`/api/planning/goals/${goal.id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  }

  return (
    <div className="rounded-card border border-surface bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <p className="font-medium text-secondary">{goal.title}</p>
        <GoalStatusBadge status={goal.status} />
      </div>

      {(project || business) && (
        <p className="mt-0.5 text-xs text-muted">{[project?.name, business?.name].filter(Boolean).join(" · ")}</p>
      )}

      {goal.description && <p className="mt-2 line-clamp-2 text-sm text-muted">{goal.description}</p>}

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs text-muted">
          <span>{t("progress")}</span>
          <span>{goal.progress}%</span>
        </div>
        <ProgressBar value={goal.progress} target={100} />
      </div>

      {goal.target_date && (
        <p className="mt-2 text-xs text-muted">
          {t("targetDate")}: {goal.target_date}
        </p>
      )}

      <div className="mt-3 flex gap-4">
        <RecordFormModal
          trigger={(open) => (
            <button type="button" onClick={open} className="text-xs text-primary hover:underline">
              {tCommon("edit")}
            </button>
          )}
          modalTitle={t("editTitle")}
        >
          {(modalProps) => <GoalForm goal={goal} projects={projects} businesses={businesses} {...modalProps} />}
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
  );
}
