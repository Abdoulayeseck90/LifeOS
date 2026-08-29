"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Droplet, Droplets, Sparkles, Leaf, Coffee, GlassWater, Plus, X, AlertTriangle } from "lucide-react";
import type { HydrationBeverageType, HydrationLogEntry, HydrationUnit, NutritionPreferences } from "@/types/health/entities";
import {
  DEFAULT_HYDRATION_TARGET_ML,
  GENERAL_HYDRATION_RANGE_ML,
  QUICK_ADD_ML_OPTIONS,
  QUICK_ADD_FL_OZ_OPTIONS,
  computeHydrationTotalMlForDate,
  groupHydrationByBeverageForDate,
  formatHydrationAmount,
  hasFluidRestrictionCondition,
  unitToMl,
} from "@/lib/health/hydration";
import { ProgressBar } from "@/components/core/progress-bar";
import { LifeOSSelect } from "@/components/core/form/lifeos-select";

const BEVERAGE_ICON: Record<HydrationBeverageType, typeof Droplet> = {
  water: Droplet,
  sparkling_water: Sparkles,
  unsweetened_tea: Leaf,
  coffee: Coffee,
  other: GlassWater,
};

// Hydration & Drinks spec, Section 26-28/37: no universal water
// prescription — the shown target is either the user's own
// preferences.hydration_target_ml override or the general adult
// estimate range, always labeled as such. A matching kidney/heart
// condition never raises the target automatically; it only adds a
// "follow your healthcare professional's advice" notice (Section 37).
// Alcohol is never a loggable beverage_type here (Section 28/34).
export function HydrationTracker({
  entries,
  preferences,
  conditionNames,
}: {
  entries: HydrationLogEntry[];
  preferences: NutritionPreferences | null;
  conditionNames: string[];
}) {
  const t = useTranslations("nutrition.hydration");
  const router = useRouter();

  const unit: HydrationUnit = preferences?.hydration_unit ?? "L";
  const targetMl = preferences?.hydration_target_ml ?? DEFAULT_HYDRATION_TARGET_ML;
  const isCustomTarget = preferences?.hydration_target_ml != null;
  const showFluidRestrictionNotice = hasFluidRestrictionCondition(conditionNames);

  const today = new Date().toISOString().slice(0, 10);
  const totalMl = useMemo(() => computeHydrationTotalMlForDate(entries, today), [entries, today]);
  const byBeverage = useMemo(() => groupHydrationByBeverageForDate(entries, today), [entries, today]);

  const [logging, setLogging] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [customUnit, setCustomUnit] = useState<HydrationUnit>(unit);
  const [customBeverage, setCustomBeverage] = useState<HydrationBeverageType>("water");
  const [submitting, setSubmitting] = useState(false);

  async function logAmount(amountMl: number, beverageType: HydrationBeverageType = "water") {
    setSubmitting(true);
    await fetch("/api/health/nutrition/hydration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today, beverage_type: beverageType, amount_ml: Math.round(amountMl) }),
    });
    setSubmitting(false);
    router.refresh();
  }

  async function handleCustomSubmit(event: React.FormEvent) {
    event.preventDefault();
    const value = parseFloat(customAmount);
    if (!value || value <= 0) return;
    await logAmount(unitToMl(value, customUnit), customBeverage);
    setCustomAmount("");
    setLogging(false);
  }

  async function removeEntriesOfType(beverageType: HydrationBeverageType) {
    const ids = todaysEntries.filter((e) => e.beverage_type === beverageType).map((e) => e.id);
    await Promise.all(ids.map((id) => fetch(`/api/health/nutrition/hydration/${id}`, { method: "DELETE" })));
    router.refresh();
  }

  const todaysEntries = entries.filter((e) => e.date === today);
  const quickMlOptions = unit === "fl_oz" ? QUICK_ADD_FL_OZ_OPTIONS.map((oz) => Math.round(oz * 29.5735)) : QUICK_ADD_ML_OPTIONS;
  const quickLabels = unit === "fl_oz" ? QUICK_ADD_FL_OZ_OPTIONS.map((oz) => `+${oz} fl oz`) : QUICK_ADD_ML_OPTIONS.map((ml) => `+${ml >= 1000 ? "1 L" : `${ml} mL`}`);

  return (
    <section className="mb-8 rounded-card border border-surface bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Droplets size={18} className="text-muted" />
        <h2 className="text-sm font-semibold text-secondary">{t("title")}</h2>
      </div>

      {showFluidRestrictionNotice && (
        <div className="mb-3 flex items-start gap-2 rounded-card border border-status-attention/30 bg-status-attention/5 p-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-status-attention" />
          <p className="text-sm text-secondary">{t("fluidRestrictionNotice")}</p>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold text-secondary">
            {formatHydrationAmount(totalMl, unit)}
            <span className="text-base font-normal text-muted"> / {formatHydrationAmount(targetMl, unit)}</span>
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {isCustomTarget
              ? t("customTargetNote")
              : t("generalEstimateNote", {
                  low: formatHydrationAmount(GENERAL_HYDRATION_RANGE_ML.low, unit),
                  high: formatHydrationAmount(GENERAL_HYDRATION_RANGE_ML.high, unit),
                })}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <ProgressBar value={totalMl} target={targetMl} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {quickMlOptions.map((ml, i) => (
          <button
            key={ml}
            type="button"
            disabled={submitting}
            onClick={() => logAmount(ml)}
            className="inline-flex min-h-11 items-center gap-1 rounded border border-slate-300 px-3 py-2 text-sm font-medium text-secondary hover:bg-surface disabled:opacity-50"
          >
            <Plus size={14} />
            {quickLabels[i]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setLogging((v) => !v)}
          className="inline-flex min-h-11 items-center gap-1 rounded border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-muted hover:bg-surface"
        >
          {t("logADrink")}
        </button>
      </div>

      {logging && (
        <form onSubmit={handleCustomSubmit} className="mt-3 flex flex-wrap items-end gap-2 rounded-card border border-surface bg-surface/40 p-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-secondary">{t("beverage")}</label>
            <LifeOSSelect value={customBeverage} onChange={(e) => setCustomBeverage(e.target.value as HydrationBeverageType)}>
              <option value="water">{t("beverages.water")}</option>
              <option value="sparkling_water">{t("beverages.sparkling_water")}</option>
              <option value="unsweetened_tea">{t("beverages.unsweetened_tea")}</option>
              <option value="coffee">{t("beverages.coffee")}</option>
              <option value="other">{t("beverages.other")}</option>
            </LifeOSSelect>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-secondary">{t("amount")}</label>
            <input
              type="number"
              min="0"
              step="any"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="min-h-11 w-28 rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-secondary">{t("unit")}</label>
            <LifeOSSelect value={customUnit} onChange={(e) => setCustomUnit(e.target.value as HydrationUnit)}>
              <option value="mL">mL</option>
              <option value="L">L</option>
              <option value="fl_oz">fl oz</option>
            </LifeOSSelect>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-11 items-center rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {t("add")}
          </button>
        </form>
      )}

      {byBeverage.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("todaysDrinks")}</p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {byBeverage.map(({ beverage_type, amount_ml }) => {
              const Icon = BEVERAGE_ICON[beverage_type];
              return (
                <li key={beverage_type} className="flex items-center justify-between text-sm text-secondary">
                  <span className="flex items-center gap-1.5">
                    <Icon size={14} className="text-muted" />
                    {t(`beverages.${beverage_type}`)}
                  </span>
                  <span className="flex items-center gap-2">
                    {formatHydrationAmount(amount_ml, unit)}
                    <button
                      type="button"
                      onClick={() => removeEntriesOfType(beverage_type)}
                      aria-label={t("remove")}
                      className="min-h-11 min-w-11 text-muted hover:text-status-urgent"
                    >
                      <X size={14} />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
