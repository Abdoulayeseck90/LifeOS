import { getTranslations } from "next-intl/server";
import { listGoals } from "@/services/core/goals";
import { listProjects } from "@/services/core/projects";
import { listBusinesses } from "@/services/core/businesses";
import { GoalAddButton } from "@/components/planning/goal-add-button";
import { GoalCard } from "@/components/planning/goal-card";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const t = await getTranslations("planning.goals");
  const [goals, projects, businesses] = await Promise.all([listGoals(), listProjects(), listBusinesses()]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-secondary">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </div>
        <GoalAddButton projects={projects} businesses={businesses} />
      </div>

      {goals.length === 0 ? (
        <div className="rounded-card border border-dashed border-surface p-8 text-center">
          <p className="text-sm font-medium text-secondary">{t("emptyTitle")}</p>
          <p className="mt-1 text-sm text-muted">{t("emptyMessage")}</p>
          <div className="mt-4 flex justify-center">
            <GoalAddButton projects={projects} businesses={businesses} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} projects={projects} businesses={businesses} />
          ))}
        </div>
      )}
    </div>
  );
}
