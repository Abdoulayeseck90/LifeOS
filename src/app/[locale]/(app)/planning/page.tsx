import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { listProjects } from "@/services/core/projects";
import { listGoals } from "@/services/core/goals";
import { listTasks } from "@/services/core/tasks";
import { listBusinesses } from "@/services/core/businesses";
import { ProjectAddButton } from "@/components/planning/project-add-button";
import { InfoCard } from "@/components/core/info-card";
import { SectionHeader } from "@/components/core/section-header";
import { ProgressBar } from "@/components/core/progress-bar";
import { FolderKanban, CheckSquare, Target, BriefcaseBusiness } from "lucide-react";

// Planning & Business spec, Section 4: Overview answers "what am I
// working on / trying to accomplish / doing next" with a SUMMARY —
// never every project and every task (that's what /projects and
// /tasks are for).
export const dynamic = "force-dynamic";

const RECENT_TASKS_LIMIT = 5;
const GOALS_LIMIT = 4;

export default async function PlanningOverviewPage() {
  const t = await getTranslations("planning.overview");
  const [projects, goals, tasks, businesses] = await Promise.all([listProjects(), listGoals(), listTasks(), listBusinesses()]);

  const activeProjects = projects.filter((p) => p.status === "active");
  const openTasks = tasks
    .filter((tsk) => tsk.status === "open" || tsk.status === "in_progress")
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))
    .slice(0, RECENT_TASKS_LIMIT);
  const activeGoals = goals.filter((g) => g.status !== "archived").slice(0, GOALS_LIMIT);
  const activeBusinesses = businesses.filter((b) => b.status === "active");

  const activity = [
    ...projects.map((p) => ({ id: p.id, label: p.name, kind: t("activityProject"), at: p.updated_at, href: `/projects/${p.id}` })),
    ...tasks.map((tsk) => ({ id: tsk.id, label: tsk.title, kind: t("activityTask"), at: tsk.updated_at, href: "/tasks" })),
    ...goals.map((g) => ({ id: g.id, label: g.title, kind: t("activityGoal"), at: g.updated_at, href: "/goals" })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-secondary">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </div>
        <ProjectAddButton businesses={businesses} />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard icon={FolderKanban} label={t("activeProjects")} action={{ label: t("viewAll"), href: "/projects" }}>
          <p className="text-2xl font-semibold text-secondary">{activeProjects.length}</p>
        </InfoCard>
        <InfoCard icon={CheckSquare} label={t("openTasks")} action={{ label: t("viewAll"), href: "/tasks" }}>
          <p className="text-2xl font-semibold text-secondary">{tasks.filter((tsk) => tsk.status === "open" || tsk.status === "in_progress").length}</p>
        </InfoCard>
        <InfoCard icon={Target} label={t("goals")} action={{ label: t("viewAll"), href: "/goals" }}>
          <p className="text-2xl font-semibold text-secondary">{goals.length}</p>
        </InfoCard>
        <InfoCard icon={BriefcaseBusiness} label={t("activeBusinesses")} action={{ label: t("viewAll"), href: "/business" }}>
          <p className="text-2xl font-semibold text-secondary">{activeBusinesses.length}</p>
        </InfoCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-card border border-surface bg-white p-4">
          <SectionHeader title={t("upcomingTasks")} action={{ label: t("viewAll"), href: "/tasks" }} />
          {openTasks.length === 0 ? (
            <p className="text-sm text-muted">{t("noTasks")}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {openTasks.map((tsk) => (
                <li key={tsk.id} className="text-sm">
                  <p className="text-secondary">{tsk.title}</p>
                  {tsk.due_date && <p className="text-xs text-muted">{tsk.due_date}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-card border border-surface bg-white p-4">
          <SectionHeader title={t("goals")} action={{ label: t("viewAll"), href: "/goals" }} />
          {activeGoals.length === 0 ? (
            <p className="text-sm text-muted">{t("noGoals")}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {activeGoals.map((g) => (
                <div key={g.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-secondary">{g.title}</span>
                    <span className="text-xs text-muted">{g.progress}%</span>
                  </div>
                  <ProgressBar value={g.progress} target={100} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-card border border-surface bg-white p-4 lg:col-span-2">
          <SectionHeader title={t("recentActivity")} />
          {activity.length === 0 ? (
            <p className="text-sm text-muted">{t("noActivity")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {activity.map((item) => (
                <li key={`${item.kind}-${item.id}`} className="flex items-center justify-between text-sm">
                  <Link href={item.href} className="text-secondary hover:text-primary">
                    <span className="text-xs text-muted">{item.kind}</span> · {item.label}
                  </Link>
                  <span className="text-xs text-muted">{new Date(item.at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
