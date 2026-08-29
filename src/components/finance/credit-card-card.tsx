"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Calculator } from "lucide-react";
import type { CreditCard } from "@/types/core/entities";
import { computeAmortization } from "@/lib/finance/amortization";
import { CreditCardForm } from "@/components/finance/credit-card-form";
import { DebtPayoffCalculator } from "@/components/finance/debt-payoff-calculator";
import { ProgressBar } from "@/components/core/progress-bar";
import { RecordFormModal } from "@/components/core/record-form-modal";
import { ConfirmDialog } from "@/components/core/confirm-dialog";

function formatAmount(amount: number): string {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// Credit & Loans spec, Section 25: utilization/monthly interest/payoff
// date/remaining interest/remaining payments are all computed live
// here, never stored. Payoff figures only show once a payment amount
// (current, falling back to minimum) is known.
export function CreditCardCard({ card }: { card: CreditCard }) {
  const t = useTranslations("finance.creditCards");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [showCalculator, setShowCalculator] = useState(false);

  const utilization = card.credit_limit > 0 ? (card.balance / card.credit_limit) * 100 : 0;
  const monthlyInterest = card.balance * (card.apr / 100 / 12);
  const payment = card.current_payment ?? card.minimum_payment ?? null;
  const projection = payment != null ? computeAmortization({ balance: card.balance, apr: card.apr, monthlyPayment: payment }) : null;

  async function handleDelete() {
    const response = await fetch(`/api/finance/credit-cards/${card.id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  }

  return (
    <div className="rounded-card border border-surface bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <p className="font-medium text-secondary">{card.name}</p>
        <div className="flex gap-3">
          <RecordFormModal
            trigger={(open) => (
              <button type="button" onClick={open} className="text-xs text-primary hover:underline">
                {tCommon("edit")}
              </button>
            )}
            modalTitle={t("editTitle")}
          >
            {(modalProps) => <CreditCardForm card={card} {...modalProps} />}
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

      <p className="mt-2 text-2xl font-semibold text-secondary">{formatAmount(card.balance)}</p>
      <p className="text-xs text-muted">
        {t("of")} {formatAmount(card.credit_limit)} · {card.apr}% {t("apr")}
      </p>
      <div className="mt-2">
        <ProgressBar value={card.balance} target={card.credit_limit} direction="atMost" />
        <p className="mt-1 text-xs text-muted">{t("utilization", { percent: Math.round(utilization) })}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted">{t("monthlyInterest")}</p>
          <p className="font-medium text-secondary">{formatAmount(monthlyInterest)}</p>
        </div>
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
              <p className="text-xs text-muted">{t("remainingPayments")}</p>
              <p className="font-medium text-secondary">{projection.months}</p>
            </div>
          </>
        )}
      </div>

      {payment == null ? (
        <p className="mt-2 text-xs text-muted">{t("noPaymentSet")}</p>
      ) : projection && !projection.willPayOff ? (
        <p className="mt-2 text-xs text-status-urgent">{t("neverPaysOff")}</p>
      ) : (
        <p className="mt-2 text-xs text-muted">{t("estimateDisclaimer")}</p>
      )}

      {card.due_date && (
        <p className="mt-1 text-xs text-muted">
          {t("dueDate")}: {card.due_date}
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
          <DebtPayoffCalculator balance={card.balance} apr={card.apr} minimumPayment={card.minimum_payment} currentPayment={card.current_payment} />
        </div>
      )}
    </div>
  );
}
