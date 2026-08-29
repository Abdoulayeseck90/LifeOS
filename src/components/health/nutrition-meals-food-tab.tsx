import { getTranslations } from "next-intl/server";
import type { Food, Meal, MealLogEntry, NutritionPreferences, ShoppingListItem } from "@/types/health/entities";
import { MealLogCard } from "@/components/health/meal-log-card";
import { MealLogAddButton } from "@/components/health/meal-log-add-button";
import { FoodAndMealsSection } from "@/components/health/food-and-meals-section";
import { MealPlannerSection } from "@/components/health/meal-planner-section";
import { ShoppingList } from "@/components/health/shopping-list";
import { NutritionLearn } from "@/components/health/nutrition-learn";
import { HealthAndNutritionGuidance } from "@/components/health/health-and-nutrition-guidance";

// Redesign Nutrition spec, Meals & Food tab — record/review meals
// (primary action + log, per Section 2) plus the existing curated
// library, meal planner, and shopping list, which the spec doesn't
// name but which live here as the closest matching tab rather than
// being dropped (Section 9 keeps everything inside Nutrition's tabs,
// never a separate sidebar page).
export async function NutritionMealsFoodTab({
  mealLogEntries,
  meals,
  foods,
  preferences,
  shoppingListItems,
}: {
  mealLogEntries: MealLogEntry[];
  meals: Meal[];
  foods: Food[];
  preferences: NutritionPreferences | null;
  shoppingListItems: ShoppingListItem[];
}) {
  const t = await getTranslations("nutrition");

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("mealLog")}</h2>
        <MealLogAddButton />
      </div>
      {mealLogEntries.length === 0 ? (
        <div className="mb-8 rounded-card border border-dashed border-surface p-8 text-center">
          <p className="text-sm text-muted">{t("emptyMeals")}</p>
        </div>
      ) : (
        <div className="mb-8 flex flex-col gap-3">
          {mealLogEntries.map((entry) => (
            <MealLogCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      <FoodAndMealsSection meals={meals} foods={foods} />

      <MealPlannerSection meals={meals} preferences={preferences} />

      <ShoppingList items={shoppingListItems} />

      <NutritionLearn />

      <HealthAndNutritionGuidance />
    </div>
  );
}
