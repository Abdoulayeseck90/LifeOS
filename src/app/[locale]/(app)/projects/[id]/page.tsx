import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { getProject } from "@/services/core/projects";
import { listGoals } from "@/services/core/goals";
import { listTasks } from "@/services/core/tasks";
import { listNotes } from "@/services/core/notes";
import { listBusinesses } from "@/services/core/businesses";
import { ProjectStatusBadge } from "@/components/planning/project-status-badge";
import { ProjectForm } from "@/components/planning/project-form";
import { TaskCard } from "@/components/planning/task-card";
import { TaskForm } from "@/components/planning/task-form";
import { GoalCard } from "@/components/planning/goal-card";
import { GoalForm } from "@/components/planning/goal-form";
import { NoteCard } from "@/components/planning/note-card";
import { RecordFormModal } from "@/components/core/record-form-modal";
import { AddRecordButton } from "@/components/core/add-record-button";
import { SectionHeader } from "@/components/core/section-header";

// Planning & Business spec, Section 6: opening a project shows its own
// header plus Tasks/Goals/Notes/Activity, all managed in place — no
// navigating to unrelated pages. Every list here is the SAME
// listTasks()/listGoals()/listNotes() result filtered by project_id in
// memory, never a project-scoped duplicate table.
export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("planning.projectDetail");

  const [project, allGoals, allTasks, allNotes, businesses] = await Promise.all([
    getProject(id),
    listGoals(),
    listTasks(),
    listNotes(),
    listBusinesses(),
  ]);

  if (!project) notFound();

  const goals = allGoals.filter((g) => g.project_id === project.id);
  const tasks = allTasks.filter((tsk) => tsk.project_id === project.id);
  const notes = allNotes.filter((n) => n.related_project_id === project.id);
  const business = businesses.find((b) => b.id === project.business_id);

  const activity = [
    ...tasks.map((tsk) => ({ id: tsk.id, label: tsk.title, kind: t("activityTask"), at: tsk.updated_at })),
    ...goals.map((g) => ({ id: g.id, label: g.title, kind: t("activityGoal"), at: g.updated_at })),
    ...notes.map((n) => ({ id: n.id, label: n.title ?? n.content.slice(0, 60), kind: t("activityNote"), at: n.updated_at })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold text-secondary">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          {business && (
            <Link href={`/business/${business.id}`} className="mt-1 inline-block text-sm text-primary hover:underline">
              {business.name}
            </Link>
          )}
          {project.description && <p className="mt-2 max-w-2xl text-sm text-muted">{project.description}</p>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            {project.priority && <span>{t("priority")}: {project.priority}</span>}
            {project.start_date && <span>{t("startDate")}: {project.start_date}</span>}
            {project.target_date && <span>{t("dueDate")}: {project.target_date}</span>}
            {project.category && <span>{t("category")}: {project.category}</span>}
          </div>
        </div>
        <RecordFormModal
          trigger={(open) => (
            <button type="button" onClick={open} className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-secondary hover:bg-surface">
              {t("editProject")}
            </button>
          )}
          modalTitle={t("editProject")}
        >
          {(modalProps) => <ProjectForm project={project} businesses={businesses} {...modalProps} />}
        </RecordFormModal>
      </div>

      {project.notes && (
        <div className="mb-8 rounded-card border border-surface bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("notes")}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-secondary">{project.notes}</p>
        </div>
      )}

      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <SectionHeader title={t("tasks")} />
          <AddRecordButton label={t("addTask")} modalTitle={t("addTask")}>
            {(modalProps) => <TaskForm projects={[project]} goals={goals} businesses={businesses} defaultProjectId={project.id} {...modalProps} />}
          </AddRecordButton>
        </div>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted">{t("emptyTasks")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {tasks.map((tsk) => (
              <TaskCard key={tsk.id} task={tsk} projects={[project]} goals={goals} businesses={businesses} />
            ))}
          </div>
        )}
      </div>

      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <SectionHeader title={t("goals")} />
          <AddRecordButton label={t("addGoal")} modalTitle={t("addGoal")}>
            {(modalProps) => <GoalForm projects={[project]} businesses={businesses} defaultProjectId={project.id} {...modalProps} />}
          </AddRecordButton>
        </div>
        {goals.length === 0 ? (
          <p className="text-sm text-muted">{t("emptyGoals")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {goals.map((g) => (
              <GoalCard key={g.id} goal={g} projects={[project]} businesses={businesses} />
            ))}
          </div>
        )}
      </div>

      <div className="mb-8">
        <SectionHeader title={t("notesSection")} />
        {notes.length === 0 ? (
          <p className="text-sm text-muted">{t("emptyNotes")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {notes.map((n) => (
              <NoteCard key={n.id} note={n} />
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionHeader title={t("activity")} />
        {activity.length === 0 ? (
          <p className="text-sm text-muted">{t("emptyActivity")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {activity.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="flex items-center justify-between text-sm">
                <span className="text-secondary">
                  <span className="text-xs text-muted">{item.kind}</span> · {item.label}
                </span>
                <span className="text-xs text-muted">{new Date(item.at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
