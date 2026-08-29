import { getTranslations } from "next-intl/server";
import { Utensils, GlassWater } from "lucide-react";
import type { HydrationLogEntry, HydrationUnit, MealLogEntry } from "@/types/health/entities";
import type { DateRange } from "@/lib/dates/range";
import { computeHydrationTotalMlForDate, formatHydrationAmount } from "@/lib/health/hydration";
import { DateRangeFilter } from "@/components/core/date-range-filter";
import { WeeklyNutritionAdherence } from "@/components/health/weekly-nutrition-adherence";

// Redesign Nutrition spec, History tab — chronological review of past
// meals and water intake using the shared LifeOS date-range filter
// (Section 5), filtered server-side over the already-fetched full
// lists (same pattern as the filteredBodyMetrics list on the Vitals
// page).
export async function NutritionHistoryTab({
  mealLogEntries,
  hydrationEntries,
  hydrationUnit,
  dateRange,
}: {
  mealLogEntries: MealLogEntry[];
  hydrationEntries: HydrationLogEntry[];
  hydrationUnit: HydrationUnit;
  dateRange: DateRange;
}) {
  const t = await getTranslations("nutrition.historyTab");
  const tMealType = await getTranslations("nutrition.mealType");

  function inRange(date: string): boolean {
    if (dateRange.from && date < dateRange.from) return false;
    if (dateRange.to && date > dateRange.to) return false;
    return true;
  }

  const filteredMeals = mealLogEntries.filter((entry) => inRange(entry.date));
  const filteredHydration = hydrationEntries.filter((entry) => inRange(entry.date));

  const dates = Array.from(new Set([...filteredMeals.map((e) => e.date), ...filteredHydration.map((e) => e.date)])).sort((a, b) =>
    b.localeCompare(a)
  );

  const hasAnyData = mealLogEntries.length > 0 || hydrationEntries.length > 0;

  return (
    <div>
      <WeeklyNutritionAdherence entries={mealLogEntries} />

      <DateRangeFilter quickRanges={["7d", "30d", "3m", "6m", "thisYear", "custom"]} />

      {dates.length === 0 ? (
        <div className="rounded-card border border-dashed border-surface p-8 text-center">
          <p className="text-sm text-muted">{hasAnyData ? t("noResults") : t("empty")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {dates.map((date) => {
            const dayMeals = filteredMeals.filter((entry) => entry.date === date);
            const dayWaterMl = computeHydrationTotalMlForDate(filteredHydration, date);

            return (
              <div key={date} className="rounded-card border border-surface bg-white p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  {new Date(date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </p>

                {dayMeals.length > 0 && (
                  <ul className="flex flex-col gap-1.5">
                    {dayMeals.map((entry) => (
                      <li key={entry.id} className="flex items-start gap-1.5 text-sm text-secondary">
                        <Utensils size={14} className="mt-0.5 shrink-0 text-muted" />
                        <span>
                          <span className="font-medium">{tMealType(entry.meal_type)}</span> — {entry.description}
                          {entry.calories != null && <span className="text-muted"> ({entry.calories} kcal)</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {dayWaterMl > 0 && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm text-secondary">
                    <GlassWater size={14} className="shrink-0 text-muted" />
                    {formatHydrationAmount(dayWaterMl, hydrationUnit)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
