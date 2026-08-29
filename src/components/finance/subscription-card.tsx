"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Subscription } from "@/types/core/entities";
import { toMonthlyCost, toAnnualCost } from "@/lib/finance/subscription-cost";
import { SubscriptionForm } from "@/components/finance/subscription-form";
import { RecordFormModal } from "@/components/core/record-form-modal";
import { ConfirmDialog } from "@/components/core/confirm-dialog";

function formatAmount(amount: number): string {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_CLASSES: Record<Subscription["status"], string> = {
  active: "bg-status-normal/10 text-status-normal",
  paused: "bg-status-attention/10 text-status-attention",
  cancelled: "bg-status-inactive/10 text-status-inactive",
};

// Subscriptions spec, Section 29: "Record Charge" is the one-click
// equivalent of Bills' "Mark as Paid" — see recordSubscriptionCharge()
// in services/core/subscriptions.ts for the linked-Expense-creation
// logic. Monthly/annual cost is computed live here, never stored.
export function SubscriptionCard({ subscription }: { subscription: Subscription }) {
  const t = useTranslations("finance.subscriptions");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [charging, setCharging] = useState(false);
  const [chargeError, setChargeError] = useState<string | null>(null);

  const monthlyCost = toMonthlyCost(subscription.amount, subscription.billing_frequency);
  const annualCost = toAnnualCost(subscription.amount, subscription.billing_frequency);

  async function handleRecordCharge() {
    setCharging(true);
    setChargeError(null);

    const response = await fetch(`/api/finance/subscriptions/${subscription.id}/charge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });

    setCharging(false);

    if (!response.ok) {
      setChargeError(t("chargeError"));
      return;
    }

    router.refresh();
  }

  async function handleDelete() {
    const response = await fetch(`/api/finance/subscriptions/${subscription.id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  }

  return (
    <div className="rounded-card border border-surface bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-secondary">{subscription.name}</p>
          {subscription.category && <p className="text-xs text-muted">{subscription.category}</p>}
        </div>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[subscription.status]}`}>
          {t(`statusOptions.${subscription.status}`)}
        </span>
      </div>

      <p className="mt-2 text-2xl font-semibold text-secondary">
        {formatAmount(subscription.amount)}
        <span className="ml-1 text-sm font-normal text-muted">/ {t(`frequencyOptions.${subscription.billing_frequency}`)}</span>
      </p>
      <p className="text-xs text-muted">
        {t("monthlyCost")}: {formatAmount(monthlyCost)} · {t("annualCost")}: {formatAmount(annualCost)}
      </p>
      <p className="mt-1 text-xs text-muted">{t("nextBilling", { date: subscription.next_billing_date })}</p>
      {subscription.auto_renewal && <p className="mt-1 text-xs text-muted">{t("autoRenewalLabel")}</p>}

      {chargeError && <p className="mt-2 text-xs text-status-urgent">{chargeError}</p>}

      <div className="mt-3 flex items-center gap-4">
        {subscription.status === "active" && (
          <button
            type="button"
            onClick={handleRecordCharge}
            disabled={charging}
            className="min-h-11 rounded bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {charging ? tCommon("loading") : t("recordCharge")}
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
          {(modalProps) => <SubscriptionForm subscription={subscription} {...modalProps} />}
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
