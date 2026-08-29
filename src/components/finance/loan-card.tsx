"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Calculator } from "lucide-react";
import type { Loan } from "@/types/core/entities";
import { computeAmortization, toMonthlyAmount } from "@/lib/finance/amortization";
import { LoanForm } from "@/components/finance/loan-form";
import { DebtPayoffCalculator } from "@/components/finance/debt-payoff-calculator";
import { RecordFormModal } from "@/components/core/record-form-modal";
import { ConfirmDialog } from "@/components/core/confirm-dialog";

function formatAmount(amount: number): string {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function LoanCard({ loan }: { loan: Loan }) {
  const t = useTranslations("finance.loans");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [showCalculator, setShowCalculator] = useState(false);

  const monthlyPayment = loan.minimum_payment != null ? toMonthlyAmount(loan.minimum_payment, loan.payment_frequency) : null;
  const projection = monthlyPayment != null ? computeAmortization({ balance: loan.balance, apr: loan.apr, monthlyPayment }) : null;

  async function handleDelete() {
    const response = await fetch(`/api/finance/loans/${loan.id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  }

  return (
    <div className="rounded-card border border-surface bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <p className="font-medium text-secondary">{loan.name}</p>
        <div className="flex gap-3">
          <RecordFormModal
            trigger={(open) => (
              <button type="button" onClick={open} className="text-xs text-primary hover:underline">
                {tCommon("edit")}
              </button>
            )}
            modalTitle={t("editTitle")}
          >
            {(modalProps) => <LoanForm loan={loan} {...modalProps} />}
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

      <p className="mt-2 text-2xl font-semibold text-secondary">{formatAmount(loan.balance)}</p>
      <p className="text-xs text-muted">
        {t("of")} {formatAmount(loan.original_amount)} · {loan.apr}% {t("apr")}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        {monthlyPayment != null && (
          <div>
            <p className="text-xs text-muted">{t("estimatedPayment")}</p>
            <p className="font-medium text-secondary">{formatAmount(monthlyPayment)}/mo</p>
          </div>
        )}
        {projection?.willPayOff && (
          <>
            <div>
              <p className="text-xs text-muted">{t("payoffDate")}</p>
              <p className="font-medium text-secondary">{projection.payoffDate}</p>
            </div>
            <div>
              <p className="text-xs text-muted">{t("remainingInterest")}</p>
              <p className="font-medium text-secondary">{formatAmount(projection.totalInterest ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">{t("totalRemainingPayments")}</p>
              <p className="font-medium text-secondary">{projection.months}</p>
            </div>
          </>
        )}
      </div>

      {monthlyPayment == null ? (
        <p className="mt-2 text-xs text-muted">{t("noPaymentSet")}</p>
      ) : projection && !projection.willPayOff ? (
        <p className="mt-2 text-xs text-status-urgent">{t("neverPaysOff")}</p>
      ) : (
        <p className="mt-2 text-xs text-muted">{t("estimateDisclaimer")}</p>
      )}

      {loan.next_payment_date && (
        <p className="mt-1 text-xs text-muted">
          {t("nextPaymentDate")}: {loan.next_payment_date}
        </p>
      )}

      <button
        type="button"
        onClick={() => setShowCalculator((v) => !v)}
        className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <Calculator size={15} />
        {showCalculator ? t("hideCalculator") : t("showCalculator")}
      </button>

      {showCalculator && (
        <div className="mt-2">
          <DebtPayoffCalculator balance={loan.balance} apr={loan.apr} minimumPayment={monthlyPayment} currentPayment={null} />
        </div>
      )}
    </div>
  );
}
