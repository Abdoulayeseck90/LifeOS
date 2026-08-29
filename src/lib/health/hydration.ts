import type { HydrationBeverageType, HydrationLogEntry, HydrationUnit } from "@/types/health/entities";

// Hydration & Drinks spec, Section 26/27 — there is no single
// universal daily water requirement. This is a general adult starting
// range only, always labeled as an estimate, never presented as a
// medical prescription. A user may override it with their own target
// via nutrition_preferences.hydration_target_ml (Section 27).
export const GENERAL_HYDRATION_RANGE_ML = { low: 2000, high: 2500 };
export const DEFAULT_HYDRATION_TARGET_ML = GENERAL_HYDRATION_RANGE_ML.high;

// 1 fl oz = 29.5735 mL (US customary) — matches the spec's own worked
// examples (1 L ~= 34 fl oz, 2 L ~= 68 fl oz, 2.5 L ~= 85 fl oz).
const ML_PER_FL_OZ = 29.5735;

export function mlToUnit(ml: number, unit: HydrationUnit): number {
  if (unit === "L") return ml / 1000;
  if (unit === "fl_oz") return ml / ML_PER_FL_OZ;
  return ml;
}

export function unitToMl(value: number, unit: HydrationUnit): number {
  if (unit === "L") return value * 1000;
  if (unit === "fl_oz") return value * ML_PER_FL_OZ;
  return value;
}

// Section 29 — always show the conversion so the number is never
// ambiguous between units.
export function formatHydrationAmount(ml: number, unit: HydrationUnit): string {
  if (unit === "L") return `${(ml / 1000).toFixed(1)} L`;
  if (unit === "fl_oz") return `${Math.round(ml / ML_PER_FL_OZ)} fl oz`;
  return `${Math.round(ml)} mL`;
}

export const QUICK_ADD_ML_OPTIONS = [250, 500, 750, 1000];
export const QUICK_ADD_FL_OZ_OPTIONS = [8, 16, 24, 32];

export function computeHydrationTotalMlForDate(entries: HydrationLogEntry[], date: string): number {
  return entries.filter((e) => e.date === date).reduce((sum, e) => sum + e.amount_ml, 0);
}

export function groupHydrationByBeverageForDate(
  entries: HydrationLogEntry[],
  date: string
): { beverage_type: HydrationBeverageType; amount_ml: number }[] {
  const totals = new Map<HydrationBeverageType, number>();
  for (const entry of entries) {
    if (entry.date !== date) continue;
    totals.set(entry.beverage_type, (totals.get(entry.beverage_type) ?? 0) + entry.amount_ml);
  }
  return [...totals.entries()].map(([beverage_type, amount_ml]) => ({ beverage_type, amount_ml }));
}

// Section 37 — conditions that may come with a clinician-directed
// fluid restriction. A match here must never raise the shown target;
// it only surfaces a "follow your healthcare professional's advice"
// notice instead. Deliberately a conservative substring heuristic on
// self-reported condition names, not a diagnosis.
const FLUID_RESTRICTION_KEYWORDS = ["kidney", "renal", "dialysis", "heart failure", "cardiac", "chf", "congestive"];

export function hasFluidRestrictionCondition(conditionNames: string[]): boolean {
  return conditionNames.some((name) => {
    const lower = name.toLowerCase();
    return FLUID_RESTRICTION_KEYWORDS.some((keyword) => lower.includes(keyword));
  });
}
