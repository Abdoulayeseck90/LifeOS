import { describe, it, expect } from "vitest";
import { computeDailyNutritionSummary, getWeekDates } from "@/lib/health/nutrition-summary";
import { sodiumMgToSaltG } from "@/lib/health/nutrition-targets";
import type { MealLogEntry } from "@/types/health/entities";

function entry(overrides: Partial<MealLogEntry> = {}): MealLogEntry {
  return {
    id: "id-" + Math.random(),
    user_id: "user-1",
    date: "2026-08-27",
    meal_type: "breakfast",
    description: "Oatmeal",
    notes: null,
    calories: null,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    fiber_g: null,
    sugar_g: null,
    sodium_mg: null,
    fruit_veg_g: null,
    fruit_veg_portions: null,
    created_at: "2026-08-27T08:00:00Z",
    ...overrides,
  };
}

describe("sodiumMgToSaltG", () => {
  it("converts using the standard 2.5x factor (5g salt ~= 2g sodium)", () => {
    expect(sodiumMgToSaltG(2000)).toBe(5);
  });

  it("rounds to one decimal place", () => {
    expect(sodiumMgToSaltG(1280)).toBe(3.2);
  });
});

describe("computeDailyNutritionSummary", () => {
  it("sums structured fields only for the requested date", () => {
    const entries = [
      entry({ date: "2026-08-27", fiber_g: 8, sugar_g: 10, sodium_mg: 500 }),
      entry({ date: "2026-08-27", fiber_g: 10, sugar_g: 21, sodium_mg: 780 }),
      entry({ date: "2026-08-26", fiber_g: 100, sugar_g: 100, sodium_mg: 5000 }), // different day, excluded
    ];
    const summary = computeDailyNutritionSummary(entries, "2026-08-27");
    expect(summary.mealsLogged).toBe(2);
    expect(summary.fiberG).toBe(18);
    expect(summary.sugarG).toBe(31);
    expect(summary.sodiumMg).toBe(1280);
    expect(summary.saltG).toBe(3.2);
  });

  it("returns null (not zero) for fields nobody logged — missing data isn't a bad number", () => {
    const entries = [entry({ date: "2026-08-27", description: "Just a note", fiber_g: null })];
    const summary = computeDailyNutritionSummary(entries, "2026-08-27");
    expect(summary.fiberG).toBeNull();
    expect(summary.saltG).toBeNull();
    expect(summary.mealsLogged).toBe(1);
  });

  it("only sums entries that actually provided a value, ignoring the rest", () => {
    const entries = [
      entry({ date: "2026-08-27", fiber_g: 5 }),
      entry({ date: "2026-08-27", fiber_g: null }),
    ];
    const summary = computeDailyNutritionSummary(entries, "2026-08-27");
    expect(summary.fiberG).toBe(5);
  });

  it("sums protein, carbs, and fat", () => {
    const entries = [entry({ date: "2026-08-27", protein_g: 20, carbs_g: 30, fat_g: 10 }), entry({ date: "2026-08-27", protein_g: 15, carbs_g: 25, fat_g: 5 })];
    const summary = computeDailyNutritionSummary(entries, "2026-08-27");
    expect(summary.proteinG).toBe(35);
    expect(summary.carbsG).toBe(55);
    expect(summary.fatG).toBe(15);
  });
});

describe("getWeekDates", () => {
  it("returns a Monday-starting 7-day week containing the reference date", () => {
    // 2026-08-27 is a Thursday.
    const week = getWeekDates(new Date("2026-08-27T12:00:00Z"));
    expect(week).toHaveLength(7);
    expect(week[0]).toBe("2026-08-24"); // Monday
    expect(week[6]).toBe("2026-08-30"); // Sunday
    expect(week).toContain("2026-08-27");
  });

  it("handles a Sunday reference correctly (week ends on the reference date)", () => {
    // 2026-08-30 is a Sunday.
    const week = getWeekDates(new Date("2026-08-30T12:00:00Z"));
    expect(week[0]).toBe("2026-08-24");
    expect(week[6]).toBe("2026-08-30");
  });
});
