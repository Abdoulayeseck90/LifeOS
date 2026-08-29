import { getTranslations } from "next-intl/server";
import { listFinanceTransactions } from "@/services/core/finance";
import { listProjects } from "@/services/core/projects";
import { listBusinesses } from "@/services/core/businesses";
import { TransactionAddButton } from "@/components/finance/transaction-add-button";
import { TransactionHistory } from "@/components/finance/transaction-history";

export const dynamic = "force-dynamic";

export default async function IncomePage() {
  const t = await getTranslations("finance.income");
  const [transactions, projects, businesses] = await Promise.all([listFinanceTransactions(), listProjects(), listBusinesses()]);
  const income = transactions.filter((txn) => txn.type === "income");

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-secondary">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </div>
        <TransactionAddButton defaultType="income" projects={projects} businesses={businesses} label={t("addButton")} />
      </div>

      <TransactionHistory transactions={income} projects={projects} businesses={businesses} />
    </div>
  );
}
