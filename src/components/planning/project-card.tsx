"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import type { Business, Project } from "@/types/core/entities";
import { ProjectStatusBadge } from "@/components/planning/project-status-badge";
import { ProjectForm } from "@/components/planning/project-form";
import { RecordFormModal } from "@/components/core/record-form-modal";
import { ConfirmDialog } from "@/components/core/confirm-dialog";

export function ProjectCard({ project, businesses }: { project: Project; businesses: Business[] }) {
  const t = useTranslations("planning.projects");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const business = businesses.find((b) => b.id === project.business_id);

  async function handleDelete() {
    const response = await fetch(`/api/planning/projects/${project.id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  }

  return (
    <div className="rounded-card border border-surface bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href={`/projects/${project.id}`} className="truncate font-medium text-secondary hover:text-primary">
            {project.name}
          </Link>
          {business && <p className="mt-0.5 text-xs text-muted">{business.name}</p>}
        </div>
        <ProjectStatusBadge status={project.status} />
      </div>

      {project.description && <p className="mt-2 line-clamp-2 text-sm text-muted">{project.description}</p>}

      {project.target_date && (
        <p className="mt-2 text-xs text-muted">
          {t("dueDate")}: {project.target_date}
        </p>
      )}

      <div className="mt-3 flex gap-4">
        <Link href={`/projects/${project.id}`} className="text-xs text-primary hover:underline">
          {tCommon("view")}
        </Link>
        <RecordFormModal
          trigger={(open) => (
            <button type="button" onClick={open} className="text-xs text-primary hover:underline">
              {tCommon("edit")}
            </button>
          )}
          modalTitle={t("editTitle")}
        >
          {(modalProps) => <ProjectForm project={project} businesses={businesses} {...modalProps} />}
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
