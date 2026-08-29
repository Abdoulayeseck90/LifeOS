import { getTranslations } from "next-intl/server";
import { listSubscriptions } from "@/services/core/subscriptions";
import { toMonthlyCost, toAnnualCost } from "@/lib/finance/subscription-cost";
import { SubscriptionAddButton } from "@/components/finance/subscription-add-button";
import { SubscriptionList } from "@/components/finance/subscription-list";
import { InfoCard } from "@/components/core/info-card";
import { CalendarClock, RefreshCw, Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

function formatAmount(amount: number): string {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function SubscriptionsPage() {
  const t = await getTranslations("finance.subscriptions");
  const subscriptions = await listSubscriptions();

  const active = subscriptions.filter((s) => s.status === "active");
  const totalMonthlyCost = active.reduce((sum, s) => sum + toMonthlyCost(s.amount, s.billing_frequency), 0);
  const totalAnnualCost = active.reduce((sum, s) => sum + toAnnualCost(s.amount, s.billing_frequency), 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-secondary">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </div>
        <SubscriptionAddButton />
      </div>

      {subscriptions.length === 0 ? (
        <div className="rounded-card border border-dashed border-surface p-8 text-center">
          <p className="text-sm font-medium text-secondary">{t("emptyTitle")}</p>
          <p className="mt-1 text-sm text-muted">{t("emptyMessage")}</p>
          <div className="mt-4 flex justify-center">
            <SubscriptionAddButton />
          </div>
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <InfoCard icon={Wallet} label={t("totalMonthlyCost")}>
              <p className="text-2xl font-semibold text-secondary">{formatAmount(totalMonthlyCost)}</p>
            </InfoCard>
            <InfoCard icon={CalendarClock} label={t("totalAnnualCost")}>
              <p className="text-2xl font-semibold text-secondary">{formatAmount(totalAnnualCost)}</p>
            </InfoCard>
            <InfoCard icon={RefreshCw} label={t("activeCount")}>
              <p className="text-2xl font-semibold text-secondary">{active.length}</p>
            </InfoCard>
          </div>

          <SubscriptionList subscriptions={subscriptions} />
        </>
      )}
    </div>
  );
}
