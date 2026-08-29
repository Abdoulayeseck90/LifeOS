import type { MealLogEntry } from "@/types/health/entities";
import { sodiumMgToSaltG } from "@/lib/health/nutrition-targets";

// Expand Nutrition spec, Section 1/16: "Today's Nutrition" — sums
// whatever structured fields were actually provided across a day's
// logged meals (Section 15: fields are optional, so this only adds
// what's there rather than treating missing data as zero-and-alarming).
// Pure/client-safe.
export interface DailyNutritionSummary {
  mealsLogged: number;
  fiberG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
  saltG: number | null;
  fruitVegG: number | null;
  fruitVegPortions: number | null;
  caloriesKcal: number | null;
  // Redesign Nutrition spec, Section 2/13 — added for the compact
  // Nutrition Overview's protein metric and Nutrition Tracking's
  // opt-in carbs/fat metrics.
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
}

function sumField(entries: MealLogEntry[], key: keyof MealLogEntry): number | null {
  const values = entries.map((e) => e[key]).filter((v): v is number => typeof v === "number");
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, v) => sum + v, 0) * 10) / 10;
}

// Expand Nutrition spec, Section 17: "weekly view... Mon -> Sun."
// Returns the 7 ISO date strings (YYYY-MM-DD) for the Monday-starting
// week containing `reference` (defaults to today).
export function getWeekDates(reference: Date = new Date()): string[] {
  const day = reference.getDay(); // 0 = Sunday
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(reference);
  monday.setDate(reference.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export function computeDailyNutritionSummary(entries: MealLogEntry[], date: string): DailyNutritionSummary {
  const todaysEntries = entries.filter((entry) => entry.date === date);
  const sodiumMg = sumField(todaysEntries, "sodium_mg");

  return {
    mealsLogged: todaysEntries.length,
    fiberG: sumField(todaysEntries, "fiber_g"),
    sugarG: sumField(todaysEntries, "sugar_g"),
    sodiumMg,
    saltG: sodiumMg !== null ? sodiumMgToSaltG(sodiumMg) : null,
    fruitVegG: sumField(todaysEntries, "fruit_veg_g"),
    fruitVegPortions: sumField(todaysEntries, "fruit_veg_portions"),
    caloriesKcal: sumField(todaysEntries, "calories"),
    proteinG: sumField(todaysEntries, "protein_g"),
    carbsG: sumField(todaysEntries, "carbs_g"),
    fatG: sumField(todaysEntries, "fat_g"),
  };
}
