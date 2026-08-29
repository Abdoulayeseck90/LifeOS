"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { computeAmortization, computeRequiredPaymentForTargetDate } from "@/lib/finance/amortization";
import { LifeOSInput } from "@/components/core/form/lifeos-input";

type Basis = "minimum" | "current" | "extra" | "target";

function formatAmount(amount: number): string {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

// Credit & Loans spec, Section 27-29: one interactive payoff
// calculator — the user picks a payment basis (Minimum/Current/Extra/
// Target Date) and every figure recalculates immediately, no save
// button, since this is exploration rather than a stored record.
// "Interest saved"/"Months saved" always compare against the Minimum
// Payment baseline, the one figure every debt is guaranteed to have an
// opinion about.
//
// Offline Strategy spec, Section 5: this already works completely
// offline, with no code change needed — computeAmortization/
// computeRequiredPaymentForTargetDate (src/lib/finance/amortization.ts)
// are pure, synchronous functions with zero network/Supabase
// dependency, and every input here (balance/apr/minimumPayment/
// currentPayment) is already sitting in the browser as props by the
// time this component renders. The only offline gap for Credit & Loans
// is loading/editing the card's stored balance in the first place —
// which is out of this pass's scope (only Notes/Tasks/Dua completion/
// Finance Quick Entry are offline-eligible) — not the calculation.
export function DebtPayoffCalculator({
  balance,
  apr,
  minimumPayment,
  currentPayment,
}: {
  balance: number;
  apr: number;
  minimumPayment: number | null;
  currentPayment: number | null;
}) {
  const t = useTranslations("finance.calculator");
  const [basis, setBasis] = useState<Basis>(currentPayment != null ? "current" : "minimum");
  const [additionalPayment, setAdditionalPayment] = useState("0");
  const [targetDate, setTargetDate] = useState("");

  const baselinePayment = minimumPayment ?? currentPayment ?? 0;
  const baseline = useMemo(() => computeAmortization({ balance, apr, monthlyPayment: baselinePayment }), [balance, apr, baselinePayment]);

  const basePaymentForBasis = basis === "current" ? currentPayment ?? minimumPayment ?? 0 : minimumPayment ?? currentPayment ?? 0;
  const additionalValue = parseFloat(additionalPayment) || 0;

  const requiredPaymentForTarget = useMemo(() => {
    if (basis !== "target" || !targetDate) return null;
    const months = monthsBetween(new Date(), new Date(targetDate));
    return computeRequiredPaymentForTargetDate({ balance, apr, months });
  }, [basis, targetDate, balance, apr]);

  const effectivePayment =
    basis === "extra" ? basePaymentForBasis + additionalValue : basis === "target" ? requiredPaymentForTarget ?? 0 : basePaymentForBasis;

  const result = useMemo(() => computeAmortization({ balance, apr, monthlyPayment: effectivePayment }), [balance, apr, effectivePayment]);

  const monthsSaved = baseline.willPayOff && result.willPayOff && baseline.months !== null && result.months !== null ? baseline.months - result.months : null;
  const interestSaved =
    baseline.willPayOff && result.willPayOff && baseline.totalInterest !== null && result.totalInterest !== null
      ? Math.round((baseline.totalInterest - result.totalInterest) * 100) / 100
      : null;
  const additionalNeeded = basis === "target" && requiredPaymentForTarget != null ? requiredPaymentForTarget - basePaymentForBasis : null;

  return (
    <div className="rounded-card border border-surface bg-surface/40 p-4">
      <div className="mb-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("basisLabel")}>
        {(["minimum", "current", "extra", "target"] as Basis[]).map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={basis === option}
            onClick={() => setBasis(option)}
            disabled={(option === "current" && currentPayment == null) || (option === "minimum" && minimumPayment == null)}
            className={`min-h-11 rounded border px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
              basis === option ? "border-primary bg-primary/10 text-primary" : "border-surface bg-white text-secondary hover:bg-surface"
            }`}
          >
            {t(`basis.${option}`)}
          </button>
        ))}
      </div>

      {basis === "extra" && (
        <div className="mb-3 flex flex-col gap-1.5">
          <label htmlFor="dpc-extra" className="text-sm font-medium text-secondary">
            {t("additionalPayment")}
          </label>
          <LifeOSInput id="dpc-extra" type="number" min={0} step="any" value={additionalPayment} onChange={(e) => setAdditionalPayment(e.target.value)} />
        </div>
      )}

      {basis === "target" && (
        <div className="mb-3 flex flex-col gap-1.5">
          <label htmlFor="dpc-target" className="text-sm font-medium text-secondary">
            {t("targetDateLabel")}
          </label>
          <LifeOSInput id="dpc-target" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </div>
      )}

      {basis === "target" && !targetDate ? (
        <p className="text-sm text-muted">{t("chooseTargetDate")}</p>
      ) : basis === "target" && requiredPaymentForTarget == null ? (
        <p className="text-sm text-status-urgent">{t("targetDateTooSoon")}</p>
      ) : !result.willPayOff ? (
        <p className="text-sm text-status-urgent">{t("neverPaysOff")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted">{t("requiredPayment")}</p>
            <p className="font-semibold text-secondary">{formatAmount(effectivePayment)}/mo</p>
          </div>
          <div>
            <p className="text-xs text-muted">{t("estimatedPayoffDate")}</p>
            <p className="font-semibold text-secondary">{result.payoffDate}</p>
          </div>
          <div>
            <p className="text-xs text-muted">{t("estimatedInterest")}</p>
            <p className="font-semibold text-secondary">{formatAmount(result.totalInterest ?? 0)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">{t("totalPaid")}</p>
            <p className="font-semibold text-secondary">{formatAmount(result.totalPaid ?? 0)}</p>
          </div>
          {additionalNeeded != null && (
            <div>
              <p className="text-xs text-muted">{t("additionalNeeded")}</p>
              <p className="font-semibold text-secondary">{formatAmount(Math.max(0, additionalNeeded))}/mo</p>
            </div>
          )}
          {monthsSaved != null && monthsSaved > 0 && (
            <div>
              <p className="text-xs text-muted">{t("monthsSaved")}</p>
              <p className="font-semibold text-status-normal">{monthsSaved}</p>
            </div>
          )}
          {interestSaved != null && interestSaved > 0 && (
            <div>
              <p className="text-xs text-muted">{t("interestSaved")}</p>
              <p className="font-semibold text-status-normal">{formatAmount(interestSaved)}</p>
            </div>
          )}
        </div>
      )}

      <p className="mt-3 text-xs text-muted">{t("disclaimer")}</p>
    </div>
  );
}
