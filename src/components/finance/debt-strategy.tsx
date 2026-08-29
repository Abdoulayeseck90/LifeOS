"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { computeDebtStrategy, type StrategyDebtInput } from "@/lib/finance/amortization";
import { LifeOSInput } from "@/components/core/form/lifeos-input";

function formatAmount(amount: number): string {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// Credit & Loans spec, Section 30: Avalanche vs Snowball, side by side,
// never forcing one — both computed against the SAME extra budget, and
// "Interest saved"/"Time saved" compare each strategy to the baseline
// of paying only minimums with no extra budget at all (i.e. "no
// strategy"), which is what makes a strategy worth adopting in the
// first place.
export function DebtStrategy({ debts }: { debts: StrategyDebtInput[] }) {
  const t = useTranslations("finance.debtStrategy");
  const [extraBudget, setExtraBudget] = useState("0");

  const extra = parseFloat(extraBudget) || 0;

  const baseline = useMemo(() => computeDebtStrategy({ debts, extraMonthlyBudget: 0, strategy: "avalanche" }), [debts]);
  const avalanche = useMemo(() => computeDebtStrategy({ debts, extraMonthlyBudget: extra, strategy: "avalanche" }), [debts, extra]);
  const snowball = useMemo(() => computeDebtStrategy({ debts, extraMonthlyBudget: extra, strategy: "snowball" }), [debts, extra]);

  const debtById = new Map(debts.map((d) => [d.id, d.name]));

  function renderStrategy(result: ReturnType<typeof computeDebtStrategy>, label: string) {
    const monthsSaved = baseline.willPayOffAll && result.willPayOffAll && baseline.months !== null && result.months !== null ? baseline.months - result.months : null;
    const interestSaved =
      baseline.willPayOffAll && result.willPayOffAll && baseline.totalInterest !== null && result.totalInterest !== null
        ? Math.round((baseline.totalInterest - result.totalInterest) * 100) / 100
        : null;

    return (
      <div className="rounded-card border border-surface bg-white p-4">
        <p className="mb-2 text-sm font-semibold text-secondary">{label}</p>
        <ol className="mb-3 flex flex-col gap-1 text-sm text-secondary">
          {result.order.map((id, index) => (
            <li key={id}>
              {index + 1}. {debtById.get(id) ?? id}
              {result.payoffDates[id] && <span className="text-xs text-muted"> — {result.payoffDates[id]}</span>}
            </li>
          ))}
        </ol>

        {!result.willPayOffAll ? (
          <p className="text-sm text-status-urgent">{t("neverPaysOff")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-muted">{t("payoffDate")}</p>
              <p className="font-medium text-secondary">{result.months} {t("months")}</p>
            </div>
            <div>
              <p className="text-xs text-muted">{t("totalInterest")}</p>
              <p className="font-medium text-secondary">{formatAmount(result.totalInterest ?? 0)}</p>
            </div>
            {monthsSaved != null && monthsSaved > 0 && (
              <div>
                <p className="text-xs text-muted">{t("timeSaved")}</p>
                <p className="font-medium text-status-normal">{t("monthsCount", { count: monthsSaved })}</p>
              </div>
            )}
            {interestSaved != null && interestSaved > 0 && (
              <div>
                <p className="text-xs text-muted">{t("interestSaved")}</p>
                <p className="font-medium text-status-normal">{formatAmount(interestSaved)}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-1.5 sm:max-w-xs">
        <label htmlFor="strategy-extra-budget" className="text-sm font-medium text-secondary">
          {t("extraBudget")}
        </label>
        <LifeOSInput id="strategy-extra-budget" type="number" min={0} step="any" value={extraBudget} onChange={(e) => setExtraBudget(e.target.value)} />
        <p className="text-xs text-muted">{t("extraBudgetHelper")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {renderStrategy(avalanche, t("avalanche"))}
        {renderStrategy(snowball, t("snowball"))}
      </div>

      <p className="mt-3 text-xs text-muted">{t("assumptionsNote")}</p>
    </div>
  );
}
