// Redesign Nutrition spec, Section 17: one shared, extensible category
// list for the `foods` table — matches foods_category_check in
// migration 0030.
export const FOOD_CATEGORIES = ["proteins", "whole_grains", "vegetables", "fruits", "nuts_seeds", "legumes", "other"] as const;
export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealTypeOption = (typeof MEAL_TYPES)[number];

// Section 14: personalizable, non-prescriptive goal chips.
export const NUTRITION_GOALS = [
  "increase_vegetables",
  "improve_hydration",
  "increase_fiber",
  "reduce_sodium",
  "reduce_added_sugar",
  "increase_protein",
  "weight_management",
  "general_healthy_eating",
] as const;
export type NutritionGoal = (typeof NUTRITION_GOALS)[number];

// Section 13: tracking is opt-in per metric, never all-or-nothing.
export const TRACKABLE_NUTRIENTS = ["calories", "protein", "fiber", "carbs", "fat", "sodium", "added_sugar", "fruit_veg", "water"] as const;
export type TrackableNutrient = (typeof TRACKABLE_NUTRIENTS)[number];
