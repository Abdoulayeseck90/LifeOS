import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getBusiness } from "@/services/core/businesses";
import { listProjects } from "@/services/core/projects";
import { listGoals } from "@/services/core/goals";
import { listTasks } from "@/services/core/tasks";
import { listNotes } from "@/services/core/notes";
import { listBusinesses } from "@/services/core/businesses";
import { listFinanceTransactions } from "@/services/core/finance";
import { BusinessStatusBadge } from "@/components/planning/business-status-badge";
import { BusinessForm } from "@/components/planning/business-form";
import { BusinessTabs } from "@/components/planning/business-tabs";
import { ProjectCard } from "@/components/planning/project-card";
import { ProjectForm } from "@/components/planning/project-form";
import { GoalCard } from "@/components/planning/goal-card";
import { GoalForm } from "@/components/planning/goal-form";
import { TaskCard } from "@/components/planning/task-card";
import { TaskForm } from "@/components/planning/task-form";
import { NoteCard } from "@/components/planning/note-card";
import { NoteForm } from "@/components/planning/note-form";
import { TransactionCard } from "@/components/finance/transaction-card";
import { TransactionAddButton } from "@/components/finance/transaction-add-button";
import { RecordFormModal } from "@/components/core/record-form-modal";
import { AddRecordButton } from "@/components/core/add-record-button";

// Planning & Business spec, Section 12/13/14/15/16/17: Business detail
// is a set of tabs over the SAME Projects/Goals/Tasks/Notes/Finance
// lists filtered by business_id — never a parallel "business project"
// system. Finances tab computes Revenue/Expenses/Estimated Profit live
// from finance_transactions filtered by business_id — the exact same
// rows Finance -> Income/Expenses shows, never duplicated.
export const dynamic = "force-dynamic";

export default async function BusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("planning.businessDetail");

  const [business, allProjects, allGoals, allTasks, allNotes, businesses, allTransactions] = await Promise.all([
    getBusiness(id),
    listProjects(),
    listGoals(),
    listTasks(),
    listNotes(),
    listBusinesses(),
    listFinanceTransactions(),
  ]);

  if (!business) notFound();

  const projects = allProjects.filter((p) => p.business_id === business.id);
  const goals = allGoals.filter((g) => g.business_id === business.id);
  const tasks = allTasks.filter((tsk) => tsk.business_id === business.id);
  const notes = allNotes.filter((n) => n.related_business_id === business.id);
  const transactions = allTransactions.filter((txn) => txn.business_id === business.id);
  const revenue = transactions.filter((txn) => txn.type === "income").reduce((sum, txn) => sum + txn.amount, 0);
  const expenses = transactions.filter((txn) => txn.type === "expense").reduce((sum, txn) => sum + txn.amount, 0);
  const estimatedProfit = revenue - expenses;

  const activity = [
    ...projects.map((p) => ({ id: p.id, label: p.name, kind: t("activityProject"), at: p.updated_at })),
    ...tasks.map((tsk) => ({ id: tsk.id, label: tsk.title, kind: t("activityTask"), at: tsk.updated_at })),
    ...goals.map((g) => ({ id: g.id, label: g.title, kind: t("activityGoal"), at: g.updated_at })),
    ...notes.map((n) => ({ id: n.id, label: n.title ?? n.content.slice(0, 60), kind: t("activityNote"), at: n.updated_at })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 10);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold text-secondary">{business.name}</h1>
            <BusinessStatusBadge status={business.status} />
          </div>
          {business.description && <p className="mt-2 max-w-2xl text-sm text-muted">{business.description}</p>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            {business.category && <span>{t("category")}: {business.category}</span>}
            {business.website && (
              <a href={business.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                {business.website}
              </a>
            )}
          </div>
        </div>
        <RecordFormModal
          trigger={(open) => (
            <button type="button" onClick={open} className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-secondary hover:bg-surface">
              {t("editBusiness")}
            </button>
          )}
          modalTitle={t("editBusiness")}
        >
          {(modalProps) => <BusinessForm business={business} {...modalProps} />}
        </RecordFormModal>
      </div>

      <BusinessTabs
        projects={
          <div>
            <div className="mb-3 flex justify-end">
              <AddRecordButton label={t("addProject")} modalTitle={t("addProject")}>
                {(modalProps) => <ProjectForm businesses={businesses} {...modalProps} />}
              </AddRecordButton>
            </div>
            {projects.length === 0 ? (
              <p className="text-sm text-muted">{t("emptyProjects")}</p>
            ) : (
              <div className="flex flex-col gap-3">
                {projects.map((p) => (
                  <ProjectCard key={p.id} project={p} businesses={businesses} />
                ))}
              </div>
            )}
          </div>
        }
        goals={
          <div>
            <div className="mb-3 flex justify-end">
              <AddRecordButton label={t("addGoal")} modalTitle={t("addGoal")}>
                {(modalProps) => <GoalForm projects={projects} businesses={businesses} defaultBusinessId={business.id} {...modalProps} />}
              </AddRecordButton>
            </div>
            {goals.length === 0 ? (
              <p className="text-sm text-muted">{t("emptyGoals")}</p>
            ) : (
              <div className="flex flex-col gap-3">
                {goals.map((g) => (
                  <GoalCard key={g.id} goal={g} projects={projects} businesses={businesses} />
                ))}
              </div>
            )}
          </div>
        }
        tasks={
          <div>
            <div className="mb-3 flex justify-end">
              <AddRecordButton label={t("addTask")} modalTitle={t("addTask")}>
                {(modalProps) => <TaskForm projects={projects} goals={goals} businesses={businesses} defaultBusinessId={business.id} {...modalProps} />}
              </AddRecordButton>
            </div>
            {tasks.length === 0 ? (
              <p className="text-sm text-muted">{t("emptyTasks")}</p>
            ) : (
              <div className="flex flex-col gap-3">
                {tasks.map((tsk) => (
                  <TaskCard key={tsk.id} task={tsk} projects={projects} goals={goals} businesses={businesses} />
                ))}
              </div>
            )}
          </div>
        }
        finances={
          <div>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-card border border-surface bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("revenue")}</p>
                <p className="mt-1 text-2xl font-semibold text-secondary">${revenue.toLocaleString()}</p>
              </div>
              <div className="rounded-card border border-surface bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("expenses")}</p>
                <p className="mt-1 text-2xl font-semibold text-secondary">${expenses.toLocaleString()}</p>
              </div>
              <div className="rounded-card border border-surface bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("estimatedProfit")}</p>
                <p className={`mt-1 text-2xl font-semibold ${estimatedProfit < 0 ? "text-status-urgent" : "text-secondary"}`}>
                  ${estimatedProfit.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mb-3 flex justify-end">
              <TransactionAddButton projects={projects} businesses={businesses} defaultBusinessId={business.id} label={t("addTransaction")} />
            </div>

            {transactions.length === 0 ? (
              <p className="text-sm text-muted">{t("emptyTransactions")}</p>
            ) : (
              <div className="flex flex-col gap-3">
                {[...transactions]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((txn) => (
                    <TransactionCard key={txn.id} transaction={txn} projects={projects} businesses={businesses} />
                  ))}
              </div>
            )}
          </div>
        }
        notes={
          <div>
            <div className="mb-3 flex justify-end">
              <AddRecordButton label={t("addNote")} modalTitle={t("addNote")} variant="drawer">
                {(modalProps) => (
                  <NoteForm projects={projects} goals={goals} businesses={businesses} defaultBusinessId={business.id} {...modalProps} />
                )}
              </AddRecordButton>
            </div>
            {notes.length === 0 ? (
              <p className="text-sm text-muted">{t("emptyNotes")}</p>
            ) : (
              <div className="flex flex-col gap-3">
                {notes.map((n) => (
                  <NoteCard key={n.id} note={n} projects={projects} goals={goals} businesses={businesses} />
                ))}
              </div>
            )}
          </div>
        }
        activity={
          activity.length === 0 ? (
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
          )
        }
      />
    </div>
  );
}
