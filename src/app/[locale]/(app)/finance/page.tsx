import { getTranslations } from "next-intl/server";
import { listFinanceTransactions } from "@/services/core/finance";
import { listProjects } from "@/services/core/projects";
import { listBusinesses } from "@/services/core/businesses";
import { listCreditCards, listLoans } from "@/services/core/credit-and-loans";
import { listBills } from "@/services/core/bills";
import { listSubscriptions } from "@/services/core/subscriptions";
import { toMonthlyAmount } from "@/lib/finance/amortization";
import { toMonthlyCost } from "@/lib/finance/subscription-cost";
import { TransactionAddButton } from "@/components/finance/transaction-add-button";
import { TransactionCard } from "@/components/finance/transaction-card";
import { QuickEntryForm } from "@/components/finance/quick-entry-form";
import { InfoCard } from "@/components/core/info-card";
import { SectionHeader } from "@/components/core/section-header";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";

// Finance spec: "Where does my money stand?" — a monthly snapshot
// (Income/Expenses/Remaining) plus recent activity, upcoming payments,
// and a debt summary — all computed live, never fake data. There is no
// Budget section in this version of LifeOS.
export const dynamic = "force-dynamic";

function formatAmount(amount: number): string {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default async function FinanceOverviewPage() {
  const t = await getTranslations("finance.overview");
  const [transactions, projects, businesses, creditCards, loans, bills, subscriptions] = await Promise.all([
    listFinanceTransactions(),
    listProjects(),
    listBusinesses(),
    listCreditCards(),
    listLoans(),
    listBills(),
    listSubscriptions(),
  ]);

  const now = new Date();
  const thisMonth = transactions.filter((txn) => {
    const d = new Date(txn.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const totalIncome = thisMonth.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = thisMonth.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const remaining = totalIncome - totalExpenses;

  const recentTransactions = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  const totalDebt = creditCards.reduce((sum, c) => sum + c.balance, 0) + loans.reduce((sum, l) => sum + l.balance, 0);
  const upcomingPayments = [
    ...creditCards
      .filter((c) => c.due_date)
      .map((c) => ({ id: `card-${c.id}`, name: c.name, date: c.due_date as string, amount: c.current_payment ?? c.minimum_payment ?? null })),
    ...loans
      .filter((l) => l.next_payment_date)
      .map((l) => ({
        id: `loan-${l.id}`,
        name: l.name,
        date: l.next_payment_date as string,
        amount: l.minimum_payment != null ? toMonthlyAmount(l.minimum_payment, l.payment_frequency) : null,
      })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  // Bills Due Soon / Subscriptions monthly total: Section 33's Finance
  // relationship diagram end state ("Everything -> Finance Overview") —
  // each sums only its own domain, never the Expense rows a paid
  // bill/charged subscription already created (no double counting; see
  // the FinanceTransaction.bill_id/subscription_id comments for how
  // those link without duplicating). Receipts are not part of Finance
  // at all — they live in the top-level Documents module.
  const in7Days = new Date(now.getTime() + 7 * 86_400_000).toISOString().slice(0, 10);
  const pendingBills = bills.filter((b) => b.status === "pending");
  const billsDueSoon = pendingBills.filter((b) => b.due_date <= in7Days).sort((a, b) => a.due_date.localeCompare(b.due_date));
  const billsDueSoonTotal = billsDueSoon.reduce((sum, b) => sum + b.amount, 0);

  const activeSubscriptions = subscriptions.filter((s) => s.status === "active");
  const subscriptionsMonthlyTotal = activeSubscriptions.reduce((sum, s) => sum + toMonthlyCost(s.amount, s.billing_frequency), 0);

  const hasAnyData =
    transactions.length > 0 || creditCards.length > 0 || loans.length > 0 || bills.length > 0 || subscriptions.length > 0;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-secondary">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </div>
        <TransactionAddButton projects={projects} businesses={businesses} />
      </div>

      <div className="mb-8">
        <QuickEntryForm />
      </div>

      {!hasAnyData ? (
        <div className="rounded-card border border-dashed border-surface p-8 text-center">
          <p className="text-sm font-medium text-secondary">{t("emptyTitle")}</p>
          <div className="mt-4 flex justify-center">
            <TransactionAddButton projects={projects} businesses={businesses} />
          </div>
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <InfoCard icon={TrendingUp} label={t("totalIncome")}>
              <p className="text-2xl font-semibold text-secondary">{formatAmount(totalIncome)}</p>
              <p className="mt-1 text-xs text-muted">{t("thisMonth")}</p>
            </InfoCard>
            <InfoCard icon={TrendingDown} label={t("totalExpenses")}>
              <p className="text-2xl font-semibold text-secondary">{formatAmount(totalExpenses)}</p>
              <p className="mt-1 text-xs text-muted">{t("thisMonth")}</p>
            </InfoCard>
            <InfoCard icon={Wallet} label={t("remaining")}>
              <p className={`text-2xl font-semibold ${remaining < 0 ? "text-status-urgent" : "text-secondary"}`}>{formatAmount(remaining)}</p>
              <p className="mt-1 text-xs text-muted">{t("thisMonth")}</p>
            </InfoCard>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-card border border-surface bg-white p-4 lg:col-span-2">
              <SectionHeader title={t("recentTransactions")} />
              {recentTransactions.length === 0 ? (
                <p className="text-sm text-muted">{t("noTransactions")}</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {recentTransactions.map((txn) => (
                    <TransactionCard key={txn.id} transaction={txn} projects={projects} businesses={businesses} />
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-card border border-surface bg-white p-4">
              <SectionHeader title={t("upcomingPayments")} action={{ label: t("viewAll"), href: "/finance/credit-and-loans" }} />
              {upcomingPayments.length === 0 ? (
                <p className="text-sm text-muted">{t("noUpcomingPayments")}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {upcomingPayments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between text-sm">
                      <span className="text-secondary">{p.name}</span>
                      <span className="text-xs text-muted">
                        {p.date}
                        {p.amount != null && ` · ${formatAmount(p.amount)}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-card border border-surface bg-white p-4">
              <SectionHeader title={t("debtSummary")} action={{ label: t("viewAll"), href: "/finance/credit-and-loans" }} />
              {creditCards.length === 0 && loans.length === 0 ? (
                <p className="text-sm text-muted">{t("noDebt")}</p>
              ) : (
                <p className="text-2xl font-semibold text-secondary">{formatAmount(totalDebt)}</p>
              )}
            </section>

            <section className="rounded-card border border-surface bg-white p-4">
              <SectionHeader title={t("billsDueSoon")} action={{ label: t("viewAll"), href: "/finance/bills" }} />
              {billsDueSoon.length === 0 ? (
                <p className="text-sm text-muted">{t("noBillsDueSoon")}</p>
              ) : (
                <>
                  <p className="text-2xl font-semibold text-secondary">{formatAmount(billsDueSoonTotal)}</p>
                  <ul className="mt-2 flex flex-col gap-2">
                    {billsDueSoon.slice(0, 5).map((bill) => (
                      <li key={bill.id} className="flex items-center justify-between text-sm">
                        <span className="text-secondary">{bill.name}</span>
                        <span className="text-xs text-muted">
                          {bill.due_date} · {formatAmount(bill.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            <section className="rounded-card border border-surface bg-white p-4">
              <SectionHeader title={t("subscriptionsMonthlyTotal")} action={{ label: t("viewAll"), href: "/finance/subscriptions" }} />
              {activeSubscriptions.length === 0 ? (
                <p className="text-sm text-muted">{t("noSubscriptions")}</p>
              ) : (
                <p className="text-2xl font-semibold text-secondary">{formatAmount(subscriptionsMonthlyTotal)}</p>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
