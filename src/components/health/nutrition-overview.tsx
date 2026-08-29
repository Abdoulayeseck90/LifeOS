"use client";

import { useTranslations } from "next-intl";
import { Flame, Beef, Wheat, Droplet, Droplets } from "lucide-react";
import type { HydrationLogEntry, MealLogEntry, NutritionPreferences } from "@/types/health/entities";
import { computeDailyNutritionSummary } from "@/lib/health/nutrition-summary";
import { DEFAULT_HYDRATION_TARGET_ML, computeHydrationTotalMlForDate, formatHydrationAmount } from "@/lib/health/hydration";
import { ProgressBar } from "@/components/core/progress-bar";

// Redesign Nutrition spec, Overview tab: "Today's nutrition" shows
// exactly Calories / Protein / Carbohydrates / Fat / Water — the
// broader set (fruit/veg, sodium, sugar, fiber) moved to the opt-in
// NutritionTracking section so this stays the compact top-of-page
// summary the spec asks for. A chip only renders a progress bar when
// today's value AND a user-set goal target both exist — never a
// fabricated target.
function StatChip({
  icon: Icon,
  label,
  value,
  hasData,
  target,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  hasData: boolean;
  target?: { value: number; max: number };
}) {
  return (
    <div className="rounded-card border border-surface bg-white p-3">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Icon size={15} className="text-muted" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      </div>
      <p className="text-sm font-semibold text-secondary">{value}</p>
      {hasData && target && (
        <div className="mt-1.5">
          <ProgressBar value={target.value} target={target.max} />
        </div>
      )}
    </div>
  );
}

export function NutritionOverview({
  entries,
  hydrationEntries,
  preferences,
}: {
  entries: MealLogEntry[];
  hydrationEntries: HydrationLogEntry[];
  preferences: NutritionPreferences | null;
}) {
  const t = useTranslations("nutrition.overview");
  const today = new Date().toISOString().slice(0, 10);
  const summary = computeDailyNutritionSummary(entries, today);

  const hydrationUnit = preferences?.hydration_unit ?? "L";
  const hydrationTargetMl = preferences?.hydration_target_ml ?? DEFAULT_HYDRATION_TARGET_ML;
  const hydrationTotalMl = computeHydrationTotalMlForDate(hydrationEntries, today);

  const calorieTarget = preferences?.calorie_target ?? null;
  const proteinTarget = preferences?.protein_target_g ?? null;
  const carbsTarget = preferences?.carbs_target_g ?? null;
  const fatTarget = preferences?.fat_target_g ?? null;

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t("title")}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatChip
          icon={Flame}
          label={t("calories")}
          hasData={summary.caloriesKcal !== null}
          value={summary.caloriesKcal !== null ? `${summary.caloriesKcal} kcal` : t("noData")}
          target={summary.caloriesKcal !== null && calorieTarget !== null ? { value: summary.caloriesKcal, max: calorieTarget } : undefined}
        />
        <StatChip
          icon={Beef}
          label={t("protein")}
          hasData={summary.proteinG !== null}
          value={summary.proteinG !== null ? `${summary.proteinG} g` : t("noData")}
          target={summary.proteinG !== null && proteinTarget !== null ? { value: summary.proteinG, max: proteinTarget } : undefined}
        />
        <StatChip
          icon={Wheat}
          label={t("carbs")}
          hasData={summary.carbsG !== null}
          value={summary.carbsG !== null ? `${summary.carbsG} g` : t("noData")}
          target={summary.carbsG !== null && carbsTarget !== null ? { value: summary.carbsG, max: carbsTarget } : undefined}
        />
        <StatChip
          icon={Droplet}
          label={t("fat")}
          hasData={summary.fatG !== null}
          value={summary.fatG !== null ? `${summary.fatG} g` : t("noData")}
          target={summary.fatG !== null && fatTarget !== null ? { value: summary.fatG, max: fatTarget } : undefined}
        />
        <StatChip
          icon={Droplets}
          label={t("water")}
          hasData
          value={`${formatHydrationAmount(hydrationTotalMl, hydrationUnit)} / ${formatHydrationAmount(hydrationTargetMl, hydrationUnit)}`}
          target={{ value: hydrationTotalMl, max: hydrationTargetMl }}
        />
      </div>
    </section>
  );
}
