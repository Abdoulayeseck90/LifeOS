"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Utensils } from "lucide-react";
import type { Food, Meal, ShoppingListCategory } from "@/types/health/entities";
import { CUISINE_FILTER_OPTIONS, CUISINE_FLAG } from "@/lib/health/cuisines";
import { FOOD_CATEGORIES, MEAL_TYPES, NUTRITION_GOALS, type NutritionGoal, type FoodCategory, type MealTypeOption } from "@/lib/health/food-categories";
import { searchFoods, searchMeals, filterFoodsByCategory, filterFoodsByCuisine, filterFoodsByGoal, filterMealsByCuisine, filterMealsByType } from "@/lib/health/food-search";
import { mealRatingToClassification } from "@/lib/health/classification";
import { LifeOSSearchInput } from "@/components/core/form/lifeos-search-input";
import { LifeOSSelect } from "@/components/core/form/lifeos-select";
import { ClassificationBadge } from "@/components/health/classification-badge";
import { FoodDetailModal } from "@/components/health/food-detail-modal";
import { MealDetailModal } from "@/components/health/meal-detail-modal";

// Redesign Nutrition spec, Section 3/10/22: the ONE browsable Food &
// Meals section — replaces the old Senegal-only SenegaleseMealsSection.
// Defaults to "All cuisines" (Section 3) so both Senegalese and
// American (and everything else) show side by side; nothing here is
// hard-coded to one cuisine. Search/filters live once, shared across
// both the Meals and Foods sub-grids below.
export function FoodAndMeals({
  meals,
  foods,
  onAddToShoppingList,
}: {
  meals: Meal[];
  foods: Food[];
  onAddToShoppingList: (items: { name: string; category: ShoppingListCategory; source: string }[]) => void;
}) {
  const t = useTranslations("nutrition.foodAndMeals");
  const tCuisines = useTranslations("nutrition.cuisines");
  const tCategories = useTranslations("nutrition.foodDetail.categories");
  const tMealTypes = useTranslations("nutrition.mealTypes");
  const tGoals = useTranslations("nutrition.goals");
  const { locale } = useParams<{ locale: string }>();
  const isFr = locale === "fr";

  const [query, setQuery] = useState("");
  const [cuisine, setCuisine] = useState<string>("all");
  const [mealType, setMealType] = useState<MealTypeOption | "all">("all");
  const [category, setCategory] = useState<FoodCategory | "all">("all");
  const [goal, setGoal] = useState<NutritionGoal | "all">("all");

  const [selectedMealId, setSelectedMealId] = useState<string | null>(null);
  const [mealDetailOpen, setMealDetailOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [foodDetailOpen, setFoodDetailOpen] = useState(false);

  const visibleMeals = useMemo(() => {
    let result = filterMealsByCuisine(meals, cuisine);
    result = filterMealsByType(result, mealType);
    result = searchMeals(result, query);
    return result;
  }, [meals, cuisine, mealType, query]);

  const visibleFoods = useMemo(() => {
    let result = filterFoodsByCuisine(foods, cuisine);
    result = filterFoodsByCategory(result, category);
    result = filterFoodsByGoal(result, goal);
    result = searchFoods(result, query);
    return result;
  }, [foods, cuisine, category, goal, query]);

  function openMeal(id: string) {
    setSelectedMealId(id);
    setMealDetailOpen(true);
  }
  function openFood(food: Food) {
    setSelectedFood(food);
    setFoodDetailOpen(true);
  }

  return (
    <section className="mb-8 rounded-card border border-surface bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Utensils size={18} className="text-muted" />
        <h2 className="text-sm font-semibold text-secondary">{t("title")}</h2>
      </div>

      <LifeOSSearchInput placeholder={t("searchPlaceholder")} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={t("searchPlaceholder")} />

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
        <div className="w-44 shrink-0 sm:w-auto">
          <LifeOSSelect value={cuisine} onChange={(e) => setCuisine(e.target.value)} aria-label={t("filterCuisine")}>
            {CUISINE_FILTER_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c !== "all" ? `${CUISINE_FLAG[c]} ` : "🌍 "}
                {tCuisines(c)}
              </option>
            ))}
          </LifeOSSelect>
        </div>

        <div className="w-44 shrink-0 sm:w-auto">
          <LifeOSSelect value={mealType} onChange={(e) => setMealType(e.target.value as MealTypeOption | "all")} aria-label={t("filterMealType")}>
            <option value="all">{t("allMealTypes")}</option>
            {MEAL_TYPES.map((mt) => (
              <option key={mt} value={mt}>
                {tMealTypes(mt)}
              </option>
            ))}
          </LifeOSSelect>
        </div>

        <div className="w-44 shrink-0 sm:w-auto">
          <LifeOSSelect value={category} onChange={(e) => setCategory(e.target.value as FoodCategory | "all")} aria-label={t("filterCategory")}>
            <option value="all">{t("allCategories")}</option>
            {FOOD_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {tCategories(c)}
              </option>
            ))}
          </LifeOSSelect>
        </div>

        <div className="w-44 shrink-0 sm:w-auto">
          <LifeOSSelect value={goal} onChange={(e) => setGoal(e.target.value as NutritionGoal | "all")} aria-label={t("filterGoal")}>
            <option value="all">{t("allGoals")}</option>
            {NUTRITION_GOALS.map((g) => (
              <option key={g} value={g}>
                {tGoals(g)}
              </option>
            ))}
          </LifeOSSelect>
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("meals", { count: visibleMeals.length })}</p>
        {visibleMeals.length === 0 ? (
          <p className="text-sm text-muted">{t("noResults")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {visibleMeals.map((meal) => (
              <button
                key={meal.id}
                type="button"
                onClick={() => openMeal(meal.id)}
                className="flex flex-col items-start rounded-card border border-surface bg-white p-3 text-left hover:border-primary"
              >
                <p className="font-medium text-secondary">{isFr ? meal.name_fr : meal.name_en}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <ClassificationBadge classification={mealRatingToClassification(meal.rating)} />
                  <span className="text-xs text-muted">
                    {CUISINE_FLAG[meal.cuisine as keyof typeof CUISINE_FLAG] ?? "🌍"} {tMealTypes(meal.meal_type)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("foods", { count: visibleFoods.length })}</p>
        {visibleFoods.length === 0 ? (
          <p className="text-sm text-muted">{t("noResults")}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {visibleFoods.map((food) => (
              <button
                key={food.id}
                type="button"
                onClick={() => openFood(food)}
                className="flex items-center gap-1.5 rounded-full border border-surface bg-white px-3 py-1.5 text-left text-sm text-secondary hover:border-primary"
              >
                {isFr ? food.name_fr : food.name_en}
                <ClassificationBadge classification={food.classification} />
              </button>
            ))}
          </div>
        )}
      </div>

      <MealDetailModal meals={meals} initialMealId={selectedMealId} open={mealDetailOpen} onOpenChange={setMealDetailOpen} onAddToShoppingList={onAddToShoppingList} />
      <FoodDetailModal food={selectedFood} open={foodDetailOpen} onOpenChange={setFoodDetailOpen} />
    </section>
  );
}
