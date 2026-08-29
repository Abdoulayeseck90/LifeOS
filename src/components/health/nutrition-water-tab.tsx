import type { HydrationLogEntry, NutritionPreferences } from "@/types/health/entities";
import { HydrationTracker } from "@/components/health/hydration-tracker";
import { DrinkChoices } from "@/components/health/drink-choices";
import { HydrationEducation } from "@/components/health/hydration-education";

// Redesign Nutrition spec, Water tab — simple hydration tracking
// (Section 3): today's total vs goal, quick-add, custom entry. Drink
// choices/education are relocated here (closest matching tab) rather
// than dropped.
export function NutritionWaterTab({
  hydrationEntries,
  preferences,
  conditionNames,
}: {
  hydrationEntries: HydrationLogEntry[];
  preferences: NutritionPreferences | null;
  conditionNames: string[];
}) {
  return (
    <div>
      <HydrationTracker entries={hydrationEntries} preferences={preferences} conditionNames={conditionNames} />
      <DrinkChoices />
      <HydrationEducation />
    </div>
  );
}
