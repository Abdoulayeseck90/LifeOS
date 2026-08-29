"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BarChart3 } from "lucide-react";
import type { HydrationLogEntry, MealLogEntry, NutritionPreferences } from "@/types/health/entities";
import { TRACKABLE_NUTRIENTS, type TrackableNutrient } from "@/lib/health/food-categories";
import { computeDailyNutritionSummary } from "@/lib/health/nutrition-summary";
import { DEFAULT_HYDRATION_TARGET_ML, computeHydrationTotalMlForDate, formatHydrationAmount } from "@/lib/health/hydration";
import { LifeOSCheckbox } from "@/components/core/form/lifeos-checkbox";

// Redesign Nutrition spec, Section 13: opt-in per metric — "Do not
// require users to track everything." Calories is off by default
// (Section 13 explicitly calls it out as "(optional)"); every other
// metric defaults on since they're the ones the rest of Nutrition
// already surfaces goals/guidance around.
const DEFAULT_VISIBLE: TrackableNutrient[] = TRACKABLE_NUTRIENTS.filter((m) => m !== "calories");

export function NutritionTracking({
  entries,
  hydrationEntries,
  preferences,
}: {
  entries: MealLogEntry[];
  hydrationEntries: HydrationLogEntry[];
  preferences: NutritionPreferences | null;
}) {
  const t = useTranslations("nutrition.tracking");
  const [visible, setVisible] = useState<TrackableNutrient[]>(DEFAULT_VISIBLE);

  const today = new Date().toISOString().slice(0, 10);
  const summary = computeDailyNutritionSummary(entries, today);
  const hydrationUnit = preferences?.hydration_unit ?? "L";
  const hydrationTargetMl = preferences?.hydration_target_ml ?? DEFAULT_HYDRATION_TARGET_ML;
  const hydrationTotalMl = computeHydrationTotalMlForDate(hydrationEntries, today);

  function toggle(metric: TrackableNutrient) {
    setVisible((prev) => (prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric]));
  }

  function valueFor(metric: TrackableNutrient): string {
    switch (metric) {
      case "calories":
        return summary.caloriesKcal !== null ? `${summary.caloriesKcal} kcal` : t("noData");
      case "protein":
        return summary.proteinG !== null ? `${summary.proteinG} g` : t("noData");
      case "fiber":
        return summary.fiberG !== null ? `${summary.fiberG} g` : t("noData");
      case "carbs":
        return summary.carbsG !== null ? `${summary.carbsG} g` : t("noData");
      case "fat":
        return summary.fatG !== null ? `${summary.fatG} g` : t("noData");
      case "sodium":
        return summary.sodiumMg !== null ? `${summary.sodiumMg} mg` : t("noData");
      case "added_sugar":
        return summary.sugarG !== null ? `${summary.sugarG} g` : t("noData");
      case "fruit_veg":
        return summary.fruitVegG !== null ? `${summary.fruitVegG} g` : t("noData");
      case "water":
        return formatHydrationAmount(hydrationTotalMl, hydrationUnit) + (hydrationTotalMl === 0 ? "" : ` / ${formatHydrationAmount(hydrationTargetMl, hydrationUnit)}`);
    }
  }

  return (
    <section className="mb-8 rounded-card border border-surface bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <BarChart3 size={18} className="text-muted" />
        <h2 className="text-sm font-semibold text-secondary">{t("title")}</h2>
      </div>
      <p className="mb-3 text-xs text-muted">{t("subtitle")}</p>

      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5">
        {TRACKABLE_NUTRIENTS.map((metric) => (
          <LifeOSCheckbox key={metric} label={t(`metrics.${metric}`)} checked={visible.includes(metric)} onChange={() => toggle(metric)} />
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted">{t("noneSelected")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((metric) => (
            <div key={metric} className="rounded border border-surface p-2 text-center">
              <p className="text-sm font-semibold text-secondary">{valueFor(metric)}</p>
              <p className="text-[11px] text-muted">{t(`metrics.${metric}`)}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
