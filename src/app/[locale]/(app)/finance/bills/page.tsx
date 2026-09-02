import { getTranslations } from "next-intl/server";
import { listBills } from "@/services/core/bills";
import { getBillDisplayStatus } from "@/lib/finance/bill-status";
import { listBusinesses } from "@/services/core/businesses";
import { listCreditCards, listLoans } from "@/services/core/credit-and-loans";
import { BillAddButton } from "@/components/finance/bill-add-button";
import { BillCard } from "@/components/finance/bill-card";
import { InfoCard } from "@/components/core/info-card";
import { SectionHeader } from "@/components/core/section-header";
import { CalendarClock, CalendarDays, Wallet } from "lucide-react";

// Bills spec, Section 25: Upcoming/Due Today/Overdue/Paid sections plus
// a "due this week / due this month / total upcoming" summary — Bills
// are never mixed into the Expenses list (a Bill is money EXPECTED to
// be paid, not money spent; see the FinanceTransaction.bill_id comment
// for how the two connect once a bill is actually paid).
export const dynamic = "force-dynamic";

function formatAmount(amount: number): string {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function BillsPage() {
  const t = await getTranslations("finance.bills");
  const [bills, businesses, creditCards, loans] = await Promise.all([listBills(), listBusinesses(), listCreditCards(), listLoans()]);

  const today = new Date();
  const in7Days = new Date(today.getTime() + 7 * 86_400_000).toISOString().slice(0, 10);
  const in30Days = new Date(today.getTime() + 30 * 86_400_000).toISOString().slice(0, 10);

  const pending = bills.filter((b) => b.status === "pending");
  const dueThisWeek = pending.filter((b) => b.due_date <= in7Days).reduce((sum, b) => sum + b.amount, 0);
  const dueThisMonth = pending.filter((b) => b.due_date <= in30Days).reduce((sum, b) => sum + b.amount, 0);
  const totalUpcoming = pending.reduce((sum, b) => sum + b.amount, 0);

  const overdue = pending.filter((b) => getBillDisplayStatus(b) === "overdue");
  const dueToday = pending.filter((b) => getBillDisplayStatus(b) === "due_today");
  const upcoming = pending.filter((b) => getBillDisplayStatus(b) === "upcoming").sort((a, b) => a.due_date.localeCompare(b.due_date));
  const paid = bills.filter((b) => b.status === "paid");

  const sections: { key: string; label: string; items: typeof bills }[] = [
    { key: "overdue", label: t("sections.overdue"), items: overdue },
    { key: "dueToday", label: t("sections.dueToday"), items: dueToday },
    { key: "upcoming", label: t("sections.upcoming"), items: upcoming },
    { key: "paid", label: t("sections.paid"), items: paid },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-secondary">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </div>
        <BillAddButton businesses={businesses} creditCards={creditCards} loans={loans} />
      </div>

      {bills.length === 0 ? (
        <div className="rounded-card border border-dashed border-surface p-8 text-center">
          <p className="text-sm font-medium text-secondary">{t("emptyTitle")}</p>
          <p className="mt-1 text-sm text-muted">{t("emptyMessage")}</p>
          <div className="mt-4 flex justify-center">
            <BillAddButton businesses={businesses} creditCards={creditCards} loans={loans} />
          </div>
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <InfoCard icon={CalendarClock} label={t("dueThisWeek")}>
              <p className="text-2xl font-semibold text-secondary">{formatAmount(dueThisWeek)}</p>
            </InfoCard>
            <InfoCard icon={CalendarDays} label={t("dueThisMonth")}>
              <p className="text-2xl font-semibold text-secondary">{formatAmount(dueThisMonth)}</p>
            </InfoCard>
            <InfoCard icon={Wallet} label={t("totalUpcoming")}>
              <p className="text-2xl font-semibold text-secondary">{formatAmount(totalUpcoming)}</p>
            </InfoCard>
          </div>

          {sections.map(
            (section) =>
              section.items.length > 0 && (
                <div key={section.key} className="mb-8">
                  <SectionHeader title={`${section.label} (${section.items.length})`} />
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {section.items.map((bill) => (
                      <BillCard key={bill.id} bill={bill} businesses={businesses} creditCards={creditCards} loans={loans} />
                    ))}
                  </div>
                </div>
              )
          )}
        </>
      )}
    </div>
  );
}
