"use client";

import { useRouter } from "next/navigation";
import type { Meal, NutritionPreferences, ShoppingListCategory } from "@/types/health/entities";
import { MealPlanner } from "@/components/health/meal-planner";

// Same shared "add to shopping list" wrapper pattern as
// FoodAndMealsSection — kept as a separate component since the Meal
// Planner is its own page section (Section 19), not nested under
// Food & Meals.
export function MealPlannerSection({ meals, preferences }: { meals: Meal[]; preferences: NutritionPreferences | null }) {
  const router = useRouter();

  async function handleAddToShoppingList(items: { name: string; category: ShoppingListCategory; source: string }[]) {
    if (items.length === 0) return;
    await fetch("/api/health/nutrition/shopping-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(items),
    });
    router.refresh();
  }

  return <MealPlanner meals={meals} preferences={preferences} onAddToShoppingList={handleAddToShoppingList} />;
}
