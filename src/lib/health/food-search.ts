import type { Food, Meal } from "@/types/health/entities";
import type { NutritionGoal } from "@/lib/health/food-categories";

// Redesign Nutrition spec, Section 18: search across English names,
// French names, categories, cuisines, and common/alternate names —
// "arachide" must find peanuts (via name_fr) and "peanut" must find
// the same row (via name_en); no separate translation step needed
// since both names already live on the row.
function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function searchFoods(foods: Food[], query: string): Food[] {
  const q = normalize(query);
  if (!q) return foods;
  return foods.filter(
    (f) =>
      normalize(f.name_en).includes(q) ||
      normalize(f.name_fr).includes(q) ||
      normalize(f.category).includes(q) ||
      normalize(f.cuisine).includes(q) ||
      f.common_names.some((n) => normalize(n).includes(q))
  );
}

export function searchMeals(meals: Meal[], query: string): Meal[] {
  const q = normalize(query);
  if (!q) return meals;
  return meals.filter(
    (m) =>
      normalize(m.name_en).includes(q) ||
      normalize(m.name_fr).includes(q) ||
      normalize(m.cuisine).includes(q) ||
      normalize(m.meal_type).includes(q) ||
      m.ingredients.some((i) => normalize(i.en).includes(q) || normalize(i.fr).includes(q))
  );
}

export function filterFoodsByCategory(foods: Food[], category: string | "all"): Food[] {
  if (category === "all") return foods;
  return foods.filter((f) => f.category === category);
}

export function filterFoodsByCuisine(foods: Food[], cuisine: string | "all"): Food[] {
  if (cuisine === "all") return foods;
  return foods.filter((f) => f.cuisine === cuisine);
}

export function filterMealsByCuisine(meals: Meal[], cuisine: string | "all"): Meal[] {
  if (cuisine === "all") return meals;
  return meals.filter((m) => m.cuisine === cuisine);
}

export function filterMealsByType(meals: Meal[], mealType: string | "all"): Meal[] {
  if (mealType === "all") return meals;
  return meals.filter((m) => m.meal_type === mealType);
}

// Section 3's "Nutrition Goal" filter — a lightweight heuristic over
// each food's own tags/macros, not a diagnosis or prescription.
const LOW_SODIUM_MG_THRESHOLD = 140; // matches the common "low sodium" per-serving reference point
export function foodMatchesGoal(food: Food, goal: NutritionGoal): boolean {
  switch (goal) {
    case "increase_vegetables":
      return food.category === "vegetables" || food.category === "fruits";
    case "increase_fiber":
      return food.health_tags.includes("high_fiber") || (food.fiber_g ?? 0) >= 3;
    case "increase_protein":
      return food.health_tags.includes("high_protein") || (food.protein_g ?? 0) >= 10;
    case "reduce_sodium":
      return (food.sodium_mg ?? 0) <= LOW_SODIUM_MG_THRESHOLD;
    case "reduce_added_sugar":
      return (food.added_sugar_g ?? 0) === 0;
    case "weight_management":
    case "general_healthy_eating":
      return food.classification === "prioritize";
    case "improve_hydration":
      return false;
    default:
      return true;
  }
}

export function filterFoodsByGoal(foods: Food[], goal: NutritionGoal | "all"): Food[] {
  if (goal === "all") return foods;
  return foods.filter((f) => foodMatchesGoal(f, goal));
}
