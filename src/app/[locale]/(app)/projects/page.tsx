import { getTranslations } from "next-intl/server";
import { listProjects } from "@/services/core/projects";
import { listBusinesses } from "@/services/core/businesses";
import { ProjectAddButton } from "@/components/planning/project-add-button";
import { ProjectCard } from "@/components/planning/project-card";

// Planning & Business spec, Section 5: Projects are the foundation of
// Planning. There is no separate Ideas page — an idea is simply a
// Project with status "idea" (the default for a new project).
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const t = await getTranslations("planning.projects");
  const [projects, businesses] = await Promise.all([listProjects(), listBusinesses()]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-secondary">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </div>
        <ProjectAddButton businesses={businesses} />
      </div>

      {projects.length === 0 ? (
        <div className="rounded-card border border-dashed border-surface p-8 text-center">
          <p className="text-sm font-medium text-secondary">{t("emptyTitle")}</p>
          <p className="mt-1 text-sm text-muted">{t("emptyMessage")}</p>
          <div className="mt-4 flex justify-center">
            <ProjectAddButton businesses={businesses} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} businesses={businesses} />
          ))}
        </div>
      )}
    </div>
  );
}
