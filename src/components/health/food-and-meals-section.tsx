"use client";

import { useRouter } from "next/navigation";
import type { Food, Meal, ShoppingListCategory } from "@/types/health/entities";
import { FoodAndMeals } from "@/components/health/food-and-meals";

// Thin client wrapper owning the "add these ingredients to my shopping
// list" action — same pattern as the old SenegaleseNutritionPlanner,
// now shared by FoodAndMeals and MealPlannerSection.
export function FoodAndMealsSection({ meals, foods }: { meals: Meal[]; foods: Food[] }) {
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

  return <FoodAndMeals meals={meals} foods={foods} onAddToShoppingList={handleAddToShoppingList} />;
}
