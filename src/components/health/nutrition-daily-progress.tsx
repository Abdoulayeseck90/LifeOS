import { getTranslations } from "next-intl/server";
import { Target } from "lucide-react";
import type { HydrationLogEntry, MealLogEntry, NutritionPreferences } from "@/types/health/entities";
import { computeDailyNutritionSummary } from "@/lib/health/nutrition-summary";
import { DEFAULT_HYDRATION_TARGET_ML, computeHydrationTotalMlForDate, formatHydrationAmount } from "@/lib/health/hydration";
import { ProgressBar } from "@/components/core/progress-bar";

type ProgressRow = {
  key: string;
  label: string;
  hasGoal: boolean;
  display: string;
  value: number;
  target: number;
};

// Redesign Nutrition spec, Overview tab "Daily progress": today's
// totals against the user's own goal targets (Goals tab) — a metric
// with no target set shows "no goal set" rather than a bar against an
// invented number (Section 4: "The goal system should be optional").
export async function NutritionDailyProgress({
  entries,
  hydrationEntries,
  preferences,
}: {
  entries: MealLogEntry[];
  hydrationEntries: HydrationLogEntry[];
  preferences: NutritionPreferences | null;
}) {
  const t = await getTranslations("nutrition.overviewTab.dailyProgress");
  const today = new Date().toISOString().slice(0, 10);
  const summary = computeDailyNutritionSummary(entries, today);

  const hydrationUnit = preferences?.hydration_unit ?? "L";
  const hydrationTotalMl = computeHydrationTotalMlForDate(hydrationEntries, today);
  const hydrationTargetMl = preferences?.hydration_target_ml ?? null;

  const rows: ProgressRow[] = [
    {
      key: "calories",
      label: t("calories"),
      hasGoal: preferences?.calorie_target != null && summary.caloriesKcal !== null,
      display: `${summary.caloriesKcal ?? 0} / ${preferences?.calorie_target ?? "?"} kcal`,
      value: summary.caloriesKcal ?? 0,
      target: preferences?.calorie_target ?? 0,
    },
    {
      key: "protein",
      label: t("protein"),
      hasGoal: preferences?.protein_target_g != null && summary.proteinG !== null,
      display: `${summary.proteinG ?? 0} / ${preferences?.protein_target_g ?? "?"} g`,
      value: summary.proteinG ?? 0,
      target: preferences?.protein_target_g ?? 0,
    },
    {
      key: "carbs",
      label: t("carbs"),
      hasGoal: preferences?.carbs_target_g != null && summary.carbsG !== null,
      display: `${summary.carbsG ?? 0} / ${preferences?.carbs_target_g ?? "?"} g`,
      value: summary.carbsG ?? 0,
      target: preferences?.carbs_target_g ?? 0,
    },
    {
      key: "fat",
      label: t("fat"),
      hasGoal: preferences?.fat_target_g != null && summary.fatG !== null,
      display: `${summary.fatG ?? 0} / ${preferences?.fat_target_g ?? "?"} g`,
      value: summary.fatG ?? 0,
      target: preferences?.fat_target_g ?? 0,
    },
    {
      key: "water",
      label: t("water"),
      hasGoal: hydrationTargetMl != null,
      display: `${formatHydrationAmount(hydrationTotalMl, hydrationUnit)} / ${formatHydrationAmount(hydrationTargetMl ?? DEFAULT_HYDRATION_TARGET_ML, hydrationUnit)}`,
      value: hydrationTotalMl,
      target: hydrationTargetMl ?? DEFAULT_HYDRATION_TARGET_ML,
    },
  ];

  return (
    <section className="mb-8 rounded-card border border-surface bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Target size={18} className="text-muted" />
        <h2 className="text-sm font-semibold text-secondary">{t("title")}</h2>
      </div>
      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.key}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-secondary">{row.label}</span>
              <span className="text-xs text-muted">{row.hasGoal ? row.display : t("noGoalSet")}</span>
            </div>
            {row.hasGoal && <ProgressBar value={row.value} target={row.target} />}
          </div>
        ))}
      </div>
    </section>
  );
}
