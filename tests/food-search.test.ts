import { describe, it, expect } from "vitest";
import { searchFoods, searchMeals, filterFoodsByCategory, filterFoodsByCuisine, filterFoodsByGoal, foodMatchesGoal } from "@/lib/health/food-search";
import type { Food, Meal } from "@/types/health/entities";

function food(overrides: Partial<Food> = {}): Food {
  return {
    id: "id-" + Math.random(),
    name_en: "Peanuts",
    name_fr: "Arachides",
    common_names: [],
    cuisine: "american",
    country_region: "United States",
    category: "nuts_seeds",
    serving_size_en: "1 oz",
    serving_size_fr: "28 g",
    calories_kcal: 160,
    protein_g: 7,
    carbs_g: 5,
    fat_g: 14,
    fiber_g: 2.4,
    sugar_g: 1,
    added_sugar_g: 0,
    sodium_mg: 5,
    saturated_fat_g: 2,
    preparation_method_en: null,
    preparation_method_fr: null,
    health_tags: ["high_protein"],
    classification: "prioritize",
    classification_reason_en: null,
    classification_reason_fr: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function meal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: "id-" + Math.random(),
    name_en: "Grilled Salmon",
    name_fr: "Saumon grillé",
    description_en: null,
    description_fr: null,
    cuisine: "american",
    meal_type: "dinner",
    serving_size_en: null,
    serving_size_fr: null,
    ingredients: [{ en: "Salmon", fr: "Saumon" }],
    preparation_en: null,
    preparation_fr: null,
    liver_conscious_preparation: [],
    foods_to_reduce: [],
    substitutions: [],
    calories_kcal: null,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    fiber_g: null,
    sugar_g: null,
    sodium_mg: null,
    rating: "best_choice",
    rating_reason_en: null,
    rating_reason_fr: null,
    tags: [],
    suggested_swap_meal_ids: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("searchFoods", () => {
  const peanuts = food({ name_en: "Peanuts", name_fr: "Arachides" });
  const salmon = food({ name_en: "Salmon", name_fr: "Saumon", category: "proteins" });
  const foods = [peanuts, salmon];

  it("finds a food by its English name", () => {
    expect(searchFoods(foods, "peanut")).toEqual([peanuts]);
  });

  it("finds a food by its French name", () => {
    expect(searchFoods(foods, "arachide")).toEqual([peanuts]);
  });

  it("finds salmon when searching in French for saumon, and in English for salmon", () => {
    expect(searchFoods(foods, "saumon")).toEqual([salmon]);
    expect(searchFoods(foods, "salmon")).toEqual([salmon]);
  });

  it("is case-insensitive", () => {
    expect(searchFoods(foods, "PEANUT")).toEqual([peanuts]);
  });

  it("matches on category and cuisine too", () => {
    expect(searchFoods(foods, "proteins")).toEqual([salmon]);
  });

  it("returns everything for an empty query", () => {
    expect(searchFoods(foods, "  ")).toEqual(foods);
  });
});

describe("searchMeals", () => {
  it("matches meal ingredients bilingually", () => {
    const meals = [meal({ name_en: "Grilled Salmon", ingredients: [{ en: "Salmon", fr: "Saumon" }] })];
    expect(searchMeals(meals, "saumon")).toEqual(meals);
  });
});

describe("filterFoodsByCategory / filterFoodsByCuisine", () => {
  const foods = [food({ category: "nuts_seeds", cuisine: "american" }), food({ category: "proteins", cuisine: "senegalese_west_african" })];

  it("'all' returns everything unfiltered", () => {
    expect(filterFoodsByCategory(foods, "all")).toEqual(foods);
    expect(filterFoodsByCuisine(foods, "all")).toEqual(foods);
  });

  it("filters to a specific category/cuisine", () => {
    expect(filterFoodsByCategory(foods, "proteins")).toEqual([foods[1]]);
    expect(filterFoodsByCuisine(foods, "senegalese_west_african")).toEqual([foods[1]]);
  });
});

describe("foodMatchesGoal / filterFoodsByGoal", () => {
  it("increase_fiber matches high-fiber tagged or >=3g fiber foods", () => {
    expect(foodMatchesGoal(food({ health_tags: ["high_fiber"], fiber_g: 1 }), "increase_fiber")).toBe(true);
    expect(foodMatchesGoal(food({ health_tags: [], fiber_g: 5 }), "increase_fiber")).toBe(true);
    expect(foodMatchesGoal(food({ health_tags: [], fiber_g: 0 }), "increase_fiber")).toBe(false);
  });

  it("reduce_sodium matches foods at or below the low-sodium threshold", () => {
    expect(foodMatchesGoal(food({ sodium_mg: 100 }), "reduce_sodium")).toBe(true);
    expect(foodMatchesGoal(food({ sodium_mg: 800 }), "reduce_sodium")).toBe(false);
  });

  it("reduce_added_sugar matches only zero-added-sugar foods", () => {
    expect(foodMatchesGoal(food({ added_sugar_g: 0 }), "reduce_added_sugar")).toBe(true);
    expect(foodMatchesGoal(food({ added_sugar_g: 4 }), "reduce_added_sugar")).toBe(false);
  });

  it("improve_hydration never matches a food (it's not a food-level goal)", () => {
    expect(foodMatchesGoal(food(), "improve_hydration")).toBe(false);
  });

  it("filterFoodsByGoal 'all' returns everything unfiltered", () => {
    const foods = [food()];
    expect(filterFoodsByGoal(foods, "all")).toEqual(foods);
  });
});
