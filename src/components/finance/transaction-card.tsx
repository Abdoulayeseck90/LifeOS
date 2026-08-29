"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { Business, FinanceTransaction, Project } from "@/types/core/entities";
import { TransactionForm } from "@/components/finance/transaction-form";
import { RecordFormModal } from "@/components/core/record-form-modal";
import { ConfirmDialog } from "@/components/core/confirm-dialog";

function formatAmount(amount: number): string {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

export function TransactionCard({ transaction, projects, businesses }: { transaction: FinanceTransaction; projects: Project[]; businesses: Business[] }) {
  const t = useTranslations("finance.transactions");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const business = businesses.find((b) => b.id === transaction.business_id);
  const project = projects.find((p) => p.id === transaction.project_id);
  const isIncome = transaction.type === "income";

  async function handleDelete() {
    const response = await fetch(`/api/finance/transactions/${transaction.id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  }

  return (
    <div className="flex items-center gap-3 rounded-card border border-surface bg-white p-4">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isIncome ? "bg-status-normal/10 text-status-normal" : "bg-status-urgent/10 text-status-urgent"}`}>
        {isIncome ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <p className="truncate font-medium text-secondary">{transaction.description}</p>
          <p className={`shrink-0 font-semibold ${isIncome ? "text-status-normal" : "text-secondary"}`}>
            {isIncome ? "+" : "-"}
            {formatAmount(transaction.amount)}
          </p>
        </div>
        <p className="mt-0.5 text-xs text-muted">
          {transaction.date} · {transaction.category}
          {(business || project) && ` · ${[business?.name, project?.name].filter(Boolean).join(", ")}`}
        </p>

        <div className="mt-2 flex gap-4">
          <RecordFormModal
            trigger={(open) => (
              <button type="button" onClick={open} className="text-xs text-primary hover:underline">
                {tCommon("edit")}
              </button>
            )}
            modalTitle={t("editTitle")}
          >
            {(modalProps) => <TransactionForm transaction={transaction} projects={projects} businesses={businesses} {...modalProps} />}
          </RecordFormModal>
          <ConfirmDialog
            trigger={(open) => (
              <button type="button" onClick={open} className="text-xs text-status-urgent hover:underline">
                {tCommon("delete")}
              </button>
            )}
            title={t("deleteConfirmTitle")}
            description={t("deleteConfirmMessage")}
            onConfirm={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}
