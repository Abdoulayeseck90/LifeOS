import { getTranslations } from "next-intl/server";
import { listTasks } from "@/services/core/tasks";
import { listGoals } from "@/services/core/goals";
import { listProjects } from "@/services/core/projects";
import { listBusinesses } from "@/services/core/businesses";
import { TaskAddButton } from "@/components/planning/task-add-button";
import { TasksList } from "@/components/planning/tasks-list";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const t = await getTranslations("planning.tasks");
  const [tasks, goals, projects, businesses] = await Promise.all([listTasks(), listGoals(), listProjects(), listBusinesses()]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-secondary">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </div>
        <TaskAddButton projects={projects} goals={goals} businesses={businesses} />
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-card border border-dashed border-surface p-8 text-center">
          <p className="text-sm font-medium text-secondary">{t("emptyTitle")}</p>
          <p className="mt-1 text-sm text-muted">{t("emptyMessage")}</p>
          <div className="mt-4 flex justify-center">
            <TaskAddButton projects={projects} goals={goals} businesses={businesses} />
          </div>
        </div>
      ) : (
        <TasksList tasks={tasks} projects={projects} goals={goals} businesses={businesses} />
      )}
    </div>
  );
}
