"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Subscription } from "@/types/core/entities";
import { toMonthlyCost } from "@/lib/finance/subscription-cost";
import { SubscriptionCard } from "@/components/finance/subscription-card";

type SortKey = "name" | "cost" | "nextBillingDate" | "category";

// Subscriptions spec, Section 29: sort by name/cost/next-billing-date/
// category — client-side over the already-fetched list, same pattern as
// TransactionHistory's search/filter.
export function SubscriptionList({ subscriptions }: { subscriptions: Subscription[] }) {
  const t = useTranslations("finance.subscriptions");
  const [sortKey, setSortKey] = useState<SortKey>("nextBillingDate");

  const sorted = useMemo(() => {
    const copy = [...subscriptions];
    switch (sortKey) {
      case "name":
        return copy.sort((a, b) => a.name.localeCompare(b.name));
      case "cost":
        return copy.sort((a, b) => toMonthlyCost(b.amount, b.billing_frequency) - toMonthlyCost(a.amount, a.billing_frequency));
      case "category":
        return copy.sort((a, b) => (a.category ?? "").localeCompare(b.category ?? ""));
      case "nextBillingDate":
      default:
        return copy.sort((a, b) => a.next_billing_date.localeCompare(b.next_billing_date));
    }
  }, [subscriptions, sortKey]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-end">
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          aria-label={t("sortBy")}
          className="rounded border border-slate-300 bg-white px-3.5 py-3 text-sm text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="nextBillingDate">{t("sortOptions.nextBillingDate")}</option>
          <option value="name">{t("sortOptions.name")}</option>
          <option value="cost">{t("sortOptions.cost")}</option>
          <option value="category">{t("sortOptions.category")}</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((subscription) => (
          <SubscriptionCard key={subscription.id} subscription={subscription} />
        ))}
      </div>
    </div>
  );
}
