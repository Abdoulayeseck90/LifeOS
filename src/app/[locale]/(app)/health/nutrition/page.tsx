import { getTranslations } from "next-intl/server";
import {
  listMealLogEntries,
  listNutritionRestrictions,
  listMeals,
  listFoods,
  getNutritionPreferences,
  listShoppingListItems,
  listHydrationLogEntries,
} from "@/services/health/nutrition";
import { listConditions } from "@/services/health/conditions";
import type { DateRange } from "@/lib/dates/range";
import { NutritionTabs } from "@/components/health/nutrition-tabs";
import { NutritionOverviewTab } from "@/components/health/nutrition-overview-tab";
import { NutritionMealsFoodTab } from "@/components/health/nutrition-meals-food-tab";
import { NutritionWaterTab } from "@/components/health/nutrition-water-tab";
import { NutritionGoalsTab } from "@/components/health/nutrition-goals-tab";
import { NutritionHistoryTab } from "@/components/health/nutrition-history-tab";

// Redesign Nutrition spec: Nutrition stays ONE sidebar item — every
// section below is organized with in-page tabs (Overview/Meals & Food/
// Water/Goals/History) instead of a long scroll or new sidebar pages
// (Section 9). All nutrition data is still fetched once up front (same
// Promise.all as before the redesign); only the presentation changed.
// Per-user data behind auth — never statically prerendered.
export const dynamic = "force-dynamic";

export default async function NutritionPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const dateRange: DateRange = { from: from ?? null, to: to ?? null };
  const t = await getTranslations("nutrition");

  const [mealLogEntries, restrictions, conditions, meals, foods, nutritionPreferences, shoppingListItems, hydrationEntries] = await Promise.all([
    listMealLogEntries(),
    listNutritionRestrictions(),
    listConditions(),
    listMeals(),
    listFoods(),
    getNutritionPreferences(),
    listShoppingListItems(),
    listHydrationLogEntries(),
  ]);
  const conditionNames = conditions.map((c) => c.name);
  const hydrationUnit = nutritionPreferences?.hydration_unit ?? "L";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-secondary">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
      </div>

      <NutritionTabs
        overview={<NutritionOverviewTab entries={mealLogEntries} hydrationEntries={hydrationEntries} preferences={nutritionPreferences} />}
        mealsFood={
          <NutritionMealsFoodTab
            mealLogEntries={mealLogEntries}
            meals={meals}
            foods={foods}
            preferences={nutritionPreferences}
            shoppingListItems={shoppingListItems}
          />
        }
        water={<NutritionWaterTab hydrationEntries={hydrationEntries} preferences={nutritionPreferences} conditionNames={conditionNames} />}
        goals={<NutritionGoalsTab preferences={nutritionPreferences} restrictions={restrictions} conditions={conditions} />}
        history={
          <NutritionHistoryTab
            mealLogEntries={mealLogEntries}
            hydrationEntries={hydrationEntries}
            hydrationUnit={hydrationUnit}
            dateRange={dateRange}
          />
        }
      />
    </div>
  );
}
