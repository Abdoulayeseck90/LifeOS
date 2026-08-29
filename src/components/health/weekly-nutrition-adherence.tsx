"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Circle } from "lucide-react";
import type { MealLogEntry } from "@/types/health/entities";
import { getWeekDates } from "@/lib/health/nutrition-summary";

const TRACKED_MEAL_TYPES: MealLogEntry["meal_type"][] = ["breakfast", "lunch", "dinner"];

// Expand Nutrition spec, Section 17/21: a simple Mon-Sun adherence
// checklist over already-logged meals — no new data model, purely a
// read view. Stacks on mobile rather than a wide table (Section 21).
export function WeeklyNutritionAdherence({ entries }: { entries: MealLogEntry[] }) {
  const t = useTranslations("nutrition.weekly");
  const { locale } = useParams<{ locale: string }>();
  const weekDates = useMemo(() => getWeekDates(), []);

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t("title")}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {weekDates.map((date) => {
          const dayEntries = entries.filter((entry) => entry.date === date);
          const loggedTypes = new Set(dayEntries.map((entry) => entry.meal_type));
          const isToday = date === new Date().toISOString().slice(0, 10);

          return (
            <div key={date} className={`rounded-card border bg-white p-3 ${isToday ? "border-primary" : "border-surface"}`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {new Date(date).toLocaleDateString(locale, { weekday: "short", day: "numeric" })}
              </p>
              <div className="mt-2 flex flex-col gap-1">
                {TRACKED_MEAL_TYPES.map((type) => {
                  const logged = loggedTypes.has(type);
                  return (
                    <p key={type} className={`flex items-center gap-1.5 text-xs ${logged ? "text-secondary" : "text-muted"}`}>
                      {logged ? <Check size={12} className="text-status-normal" /> : <Circle size={10} />}
                      {t(`mealTypeShort.${type}`)}
                    </p>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
