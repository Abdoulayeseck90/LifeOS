"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Bill, Business } from "@/types/core/entities";
import { BillForm } from "@/components/finance/bill-form";
import { BillStatusBadge } from "@/components/finance/bill-status-badge";
import { RecordFormModal } from "@/components/core/record-form-modal";
import { ConfirmDialog } from "@/components/core/confirm-dialog";

function formatAmount(amount: number): string {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Bills spec, Section 22: "Mark as Paid" creates exactly one linked
// Expense server-side (services/core/bills.ts payBill) — this button
// carries no amount/date override UI, matching the same one-click
// "complete" affordance already used for Health monitoring items.
export function BillCard({ bill, businesses }: { bill: Bill; businesses: Business[] }) {
  const t = useTranslations("finance.bills");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const canPay = bill.status === "pending";

  async function handleMarkAsPaid() {
    setPaying(true);
    setPayError(null);

    const response = await fetch(`/api/finance/bills/${bill.id}/pay`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });

    setPaying(false);

    if (!response.ok) {
      setPayError(t("payError"));
      return;
    }

    router.refresh();
  }

  async function handleDelete() {
    const response = await fetch(`/api/finance/bills/${bill.id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  }

  return (
    <div className="rounded-card border border-surface bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-secondary">{bill.name}</p>
          {bill.category && <p className="text-xs text-muted">{bill.category}</p>}
        </div>
        <BillStatusBadge bill={bill} />
      </div>

      <p className="mt-2 text-2xl font-semibold text-secondary">{formatAmount(bill.amount)}</p>
      <p className="text-xs text-muted">
        {t("dueOn", { date: bill.due_date })}
        {bill.is_recurring && bill.frequency ? ` · ${t(`frequencyOptions.${bill.frequency}`)}` : ""}
      </p>
      {bill.auto_pay && <p className="mt-1 text-xs text-muted">{t("autoPayLabel")}</p>}

      {payError && <p className="mt-2 text-xs text-status-urgent">{payError}</p>}

      <div className="mt-3 flex items-center gap-4">
        {canPay && (
          <button
            type="button"
            onClick={handleMarkAsPaid}
            disabled={paying}
            className="min-h-11 rounded bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {paying ? tCommon("loading") : t("markAsPaid")}
          </button>
        )}

        <RecordFormModal
          trigger={(open) => (
            <button type="button" onClick={open} className="text-xs text-primary hover:underline">
              {tCommon("edit")}
            </button>
          )}
          modalTitle={t("editTitle")}
        >
          {(modalProps) => <BillForm bill={bill} businesses={businesses} {...modalProps} />}
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
  );
}
