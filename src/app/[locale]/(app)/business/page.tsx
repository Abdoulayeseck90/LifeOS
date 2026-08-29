import { getTranslations } from "next-intl/server";
import { listBusinesses } from "@/services/core/businesses";
import { listProjects } from "@/services/core/projects";
import { listGoals } from "@/services/core/goals";
import { listTasks } from "@/services/core/tasks";
import { listFinanceTransactions } from "@/services/core/finance";
import { BusinessAddButton } from "@/components/planning/business-add-button";
import { BusinessCard } from "@/components/planning/business-card";
import { InfoCard } from "@/components/core/info-card";
import { BriefcaseBusiness, FolderKanban, CheckSquare, Target, TrendingUp, TrendingDown, Wallet } from "lucide-react";

// Planning & Business spec, Section 10: a concise Business overview —
// active businesses/projects/tasks/goals plus aggregate Revenue/
// Expenses/Estimated Profit across every business, computed live from
// finance_transactions (the SAME rows Finance -> Income/Expenses and
// each business's own Finances tab show), never a duplicate of
// Planning's own Projects/Goals/Tasks lists.
export const dynamic = "force-dynamic";

function formatAmount(amount: number): string {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default async function BusinessOverviewPage() {
  const t = await getTranslations("planning.businessOverview");
  const [businesses, projects, goals, tasks, transactions] = await Promise.all([
    listBusinesses(),
    listProjects(),
    listGoals(),
    listTasks(),
    listFinanceTransactions(),
  ]);

  const activeBusinesses = businesses.filter((b) => b.status === "active");
  const businessProjects = projects.filter((p) => p.business_id !== null);
  const activeBusinessProjects = businessProjects.filter((p) => p.status === "active");
  const businessGoals = goals.filter((g) => g.business_id !== null);
  const businessTasks = tasks.filter((tsk) => tsk.business_id !== null && tsk.status !== "done" && tsk.status !== "cancelled");

  const businessTransactions = transactions.filter((txn) => txn.business_id !== null);
  const revenue = businessTransactions.filter((txn) => txn.type === "income").reduce((sum, txn) => sum + txn.amount, 0);
  const expenses = businessTransactions.filter((txn) => txn.type === "expense").reduce((sum, txn) => sum + txn.amount, 0);
  const estimatedProfit = revenue - expenses;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-secondary">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </div>
        <BusinessAddButton />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard icon={BriefcaseBusiness} label={t("activeBusinesses")}>
          <p className="text-2xl font-semibold text-secondary">{activeBusinesses.length}</p>
        </InfoCard>
        <InfoCard icon={FolderKanban} label={t("activeProjects")}>
          <p className="text-2xl font-semibold text-secondary">{activeBusinessProjects.length}</p>
        </InfoCard>
        <InfoCard icon={CheckSquare} label={t("upcomingTasks")}>
          <p className="text-2xl font-semibold text-secondary">{businessTasks.length}</p>
        </InfoCard>
        <InfoCard icon={Target} label={t("goals")}>
          <p className="text-2xl font-semibold text-secondary">{businessGoals.length}</p>
        </InfoCard>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InfoCard icon={TrendingUp} label={t("revenue")}>
          <p className="text-2xl font-semibold text-secondary">{formatAmount(revenue)}</p>
        </InfoCard>
        <InfoCard icon={TrendingDown} label={t("expenses")}>
          <p className="text-2xl font-semibold text-secondary">{formatAmount(expenses)}</p>
        </InfoCard>
        <InfoCard icon={Wallet} label={t("estimatedProfit")}>
          <p className={`text-2xl font-semibold ${estimatedProfit < 0 ? "text-status-urgent" : "text-secondary"}`}>{formatAmount(estimatedProfit)}</p>
        </InfoCard>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t("businesses")}</h2>
        {businesses.length === 0 ? (
          <div className="rounded-card border border-dashed border-surface p-8 text-center">
            <p className="text-sm font-medium text-secondary">{t("emptyTitle")}</p>
            <p className="mt-1 text-sm text-muted">{t("emptyMessage")}</p>
            <div className="mt-4 flex justify-center">
              <BusinessAddButton />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {businesses.map((business) => (
              <BusinessCard key={business.id} business={business} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
