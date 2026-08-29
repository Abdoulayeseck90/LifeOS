import { describe, it, expect } from "vitest";
import { generateWeeklyPlan, aggregateWeeklyPlanIngredients, categoryForMeal, PLAN_DAYS } from "@/lib/health/meal-planner";
import type { Meal } from "@/types/health/entities";

function meal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: "id-" + Math.random(),
    name_en: "Test Meal",
    name_fr: "Repas Test",
    description_en: null,
    description_fr: null,
    cuisine: "american",
    meal_type: "lunch",
    serving_size_en: null,
    serving_size_fr: null,
    ingredients: [],
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
    rating: "good_choice",
    rating_reason_en: null,
    rating_reason_fr: null,
    tags: [],
    suggested_swap_meal_ids: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("generateWeeklyPlan", () => {
  it("returns all 7 days in order", () => {
    const plan = generateWeeklyPlan([]);
    expect(plan.map((d) => d.day)).toEqual(PLAN_DAYS);
  });

  it("mixes multiple selected cuisines across the week rather than picking only one", () => {
    const meals = [
      meal({ id: "us-1", name_en: "American Breakfast", cuisine: "american", meal_type: "breakfast" }),
      meal({ id: "sn-1", name_en: "Senegalese Breakfast", cuisine: "senegalese_west_african", meal_type: "breakfast" }),
    ];

    const plan = generateWeeklyPlan(meals, { cuisinePreferences: ["american", "senegalese_west_african"] });
    const cuisinesUsed = new Set(plan.map((d) => d.breakfast?.cuisine));

    expect(cuisinesUsed.has("american")).toBe(true);
    expect(cuisinesUsed.has("senegalese_west_african")).toBe(true);
  });

  it("filters to only the selected cuisine when a single cuisine is chosen", () => {
    const meals = [
      meal({ id: "us-1", cuisine: "american", meal_type: "breakfast" }),
      meal({ id: "sn-1", cuisine: "senegalese_west_african", meal_type: "breakfast" }),
    ];
    const plan = generateWeeklyPlan(meals, { cuisinePreferences: ["american"] });
    expect(plan.every((d) => d.breakfast?.cuisine === "american")).toBe(true);
  });

  it("defaults to all cuisines when no preference is set", () => {
    const meals = [meal({ id: "us-1", cuisine: "american", meal_type: "breakfast" }), meal({ id: "sn-1", cuisine: "senegalese_west_african", meal_type: "breakfast" })];
    const plan = generateWeeklyPlan(meals);
    const cuisinesUsed = new Set(plan.map((d) => d.breakfast?.cuisine));
    expect(cuisinesUsed.size).toBe(2);
  });

  it("excludes meals matching a disliked ingredient or name", () => {
    const meals = [
      meal({ id: "a", name_en: "Peanut Stew", meal_type: "dinner", ingredients: [{ en: "Peanuts", fr: "Arachides" }] }),
      meal({ id: "b", name_en: "Salmon Bowl", meal_type: "dinner", ingredients: [{ en: "Salmon", fr: "Saumon" }] }),
    ];
    const plan = generateWeeklyPlan(meals, { dislikes: ["peanut"] });
    expect(plan.every((d) => d.dinner?.name_en !== "Peanut Stew")).toBe(true);
  });

  it("falls back to the full library for a slot rather than leaving it empty when preferences exclude everything", () => {
    const meals = [meal({ id: "a", name_en: "Only Dinner", meal_type: "dinner", cuisine: "american" })];
    const plan = generateWeeklyPlan(meals, { cuisinePreferences: ["mexican"] });
    expect(plan.every((d) => d.dinner !== null)).toBe(true);
  });

  it("is deterministic — same inputs produce the same plan every time", () => {
    const meals = [meal({ id: "a", meal_type: "breakfast" }), meal({ id: "b", meal_type: "breakfast" })];
    const plan1 = generateWeeklyPlan(meals);
    const plan2 = generateWeeklyPlan(meals);
    expect(plan1.map((d) => d.breakfast?.id)).toEqual(plan2.map((d) => d.breakfast?.id));
  });
});

describe("categoryForMeal", () => {
  it("maps tags to shopping categories", () => {
    expect(categoryForMeal(meal({ tags: ["fish"] }))).toBe("fish");
    expect(categoryForMeal(meal({ tags: ["chicken"] }))).toBe("protein");
    expect(categoryForMeal(meal({ tags: ["legume"] }))).toBe("legumes");
    expect(categoryForMeal(meal({ tags: ["whole_grain"] }))).toBe("grains");
    expect(categoryForMeal(meal({ tags: [] }))).toBe("other");
  });
});

describe("aggregateWeeklyPlanIngredients", () => {
  it("dedupes ingredients across the week case-insensitively", () => {
    const a = meal({ name_en: "A", tags: ["fish"], ingredients: [{ en: "Salmon", fr: "Saumon" }] });
    const b = meal({ name_en: "B", tags: ["fish"], ingredients: [{ en: "salmon", fr: "saumon" }] });
    const plan = [{ day: "monday" as const, breakfast: null, lunch: a, dinner: b }];
    const items = aggregateWeeklyPlanIngredients(plan, "en");
    expect(items).toHaveLength(1);
  });
});
