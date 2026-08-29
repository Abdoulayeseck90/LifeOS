import type { Meal, ShoppingListCategory } from "@/types/health/entities";

// Redesign Nutrition spec, Section 8: supersedes the old fixed,
// Senegalese-only WEEKLY_PLAN_TEMPLATE (weekly-meal-plan.ts) with a
// generator that mixes whichever cuisines the user selected — "Allow
// multiple cuisines... this allows a user to receive a mixed weekly
// plan." Deterministic (sorted by id, round-robin per slot), not
// random: same preferences always produce the same week, which keeps
// this testable and means a page refresh doesn't reshuffle a user's
// plan out from under them.
export const PLAN_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
export type PlanDay = (typeof PLAN_DAYS)[number];

export interface ResolvedWeeklyPlanDay {
  day: PlanDay;
  breakfast: Meal | null;
  lunch: Meal | null;
  dinner: Meal | null;
}

export interface MealPlanPreferences {
  cuisinePreferences?: string[];
  dislikes?: string[];
}

function mealMatchesPreferences(meal: Meal, cuisinePreferences: string[], dislikedTerms: string[]): boolean {
  if (cuisinePreferences.length > 0 && !cuisinePreferences.includes(meal.cuisine)) return false;
  if (dislikedTerms.length === 0) return true;
  const nameLower = meal.name_en.toLowerCase();
  const ingredientsLower = meal.ingredients.map((i) => i.en.toLowerCase());
  return !dislikedTerms.some((term) => nameLower.includes(term) || ingredientsLower.some((i) => i.includes(term)));
}

function pickPoolForType(meals: Meal[], eligible: Meal[], mealType: Meal["meal_type"]): Meal[] {
  const eligibleOfType = eligible.filter((m) => m.meal_type === mealType);
  // Never let an over-narrow preference (e.g. one disliked ingredient
  // that happens to rule out every remaining breakfast) produce an
  // empty slot — fall back to the full library for that one slot
  // rather than showing nothing.
  const pool = eligibleOfType.length > 0 ? eligibleOfType : meals.filter((m) => m.meal_type === mealType);
  return [...pool].sort((a, b) => a.id.localeCompare(b.id));
}

// Section 8: mixes whichever cuisines are selected into one week. An
// empty cuisinePreferences list means "all cuisines" (Section 3's
// stated default), so nothing is filtered out.
export function generateWeeklyPlan(meals: Meal[], preferences: MealPlanPreferences = {}): ResolvedWeeklyPlanDay[] {
  const cuisinePreferences = preferences.cuisinePreferences ?? [];
  const dislikedTerms = (preferences.dislikes ?? []).map((d) => d.trim().toLowerCase()).filter(Boolean);

  const eligible = meals.filter((m) => mealMatchesPreferences(m, cuisinePreferences, dislikedTerms));

  const breakfasts = pickPoolForType(meals, eligible, "breakfast");
  const lunches = pickPoolForType(meals, eligible, "lunch");
  const dinners = pickPoolForType(meals, eligible, "dinner");

  return PLAN_DAYS.map((day, i) => ({
    day,
    breakfast: breakfasts.length > 0 ? (breakfasts[i % breakfasts.length] ?? null) : null,
    lunch: lunches.length > 0 ? (lunches[i % lunches.length] ?? null) : null,
    dinner: dinners.length > 0 ? (dinners[i % dinners.length] ?? null) : null,
  }));
}

// Best-effort category guess from a meal's own tags — used both for
// the single-meal "Add to Shopping List" action (meal-detail-modal.tsx)
// and this whole-week aggregation (Section 16's "Generate Shopping
// List").
export function categoryForMeal(meal: Meal): ShoppingListCategory {
  if (meal.tags.includes("fish")) return "fish";
  if (meal.tags.includes("chicken") || meal.tags.includes("turkey") || meal.tags.includes("eggs")) return "protein";
  if (meal.tags.includes("legume")) return "legumes";
  if (meal.tags.includes("whole_grain")) return "grains";
  return "other";
}

export function aggregateWeeklyPlanIngredients(
  plan: ResolvedWeeklyPlanDay[],
  locale: string
): { name: string; category: ShoppingListCategory; source: string }[] {
  const isFr = locale === "fr";
  const seen = new Set<string>();
  const items: { name: string; category: ShoppingListCategory; source: string }[] = [];

  for (const day of plan) {
    for (const meal of [day.breakfast, day.lunch, day.dinner]) {
      if (!meal) continue;
      const mealName = isFr ? meal.name_fr : meal.name_en;
      const category = categoryForMeal(meal);
      for (const ingredient of meal.ingredients) {
        const name = isFr ? ingredient.fr : ingredient.en;
        const key = name.trim().toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        items.push({ name, category, source: mealName });
      }
    }
  }

  return items;
}
