import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { HydrationLogEntry, MealLogEntry, NutritionPreferences } from "@/types/health/entities";
import { NutritionOverview } from "@/components/health/nutrition-overview";
import { NutritionDailyProgress } from "@/components/health/nutrition-daily-progress";
import { NutritionGoals } from "@/components/health/nutrition-goals";
import { NutritionTracking } from "@/components/health/nutrition-tracking";
import { NutritionQuickActions } from "@/components/health/nutrition-quick-actions";
import { MealLogCard } from "@/components/health/meal-log-card";

const RECENT_MEALS_LIMIT = 5;

// Redesign Nutrition spec, Overview tab — the default tab: a compact
// "what have I consumed today?" summary, never a dumping ground for
// every section (Section 3: "do not overcrowd the dashboard"). Meal
// list is already sorted newest-first by listMealLogEntries().
export async function NutritionOverviewTab({
  entries,
  hydrationEntries,
  preferences,
}: {
  entries: MealLogEntry[];
  hydrationEntries: HydrationLogEntry[];
  preferences: NutritionPreferences | null;
}) {
  const t = await getTranslations("nutrition.overviewTab");
  const recentMeals = entries.slice(0, RECENT_MEALS_LIMIT);

  return (
    <div>
      <NutritionOverview entries={entries} hydrationEntries={hydrationEntries} preferences={preferences} />
      <NutritionDailyProgress entries={entries} hydrationEntries={hydrationEntries} preferences={preferences} />
      <NutritionGoals preferences={preferences} />

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("recentMeals")}</h2>
          {entries.length > 0 && (
            <Link href="?tab=mealsFood" className="text-xs font-medium text-primary hover:underline">
              {t("viewAll")}
            </Link>
          )}
        </div>
        {recentMeals.length === 0 ? (
          <div className="rounded-card border border-dashed border-surface p-8 text-center">
            <p className="text-sm text-muted">{t("emptyMeals")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {recentMeals.map((entry) => (
              <MealLogCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </section>

      <NutritionTracking entries={entries} hydrationEntries={hydrationEntries} preferences={preferences} />

      <NutritionQuickActions />
    </div>
  );
}
