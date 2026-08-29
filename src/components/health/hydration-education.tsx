"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BookOpen, ChevronDown } from "lucide-react";

// Hydration & Drinks spec, Section 36 — same collapsed-by-default
// pattern as NutritionEducation.
const TOPICS = [
  "howMuchShouldIDrink",
  "litersVsFluidOunces",
  "whatCountsAsAFluid",
  "doesFoodProvideWater",
  "howCanIDrinkMoreWater",
  "areSugaryDrinksGoodForHydration",
  "isFruitJuiceTheSameAsWholeFruit",
  "whatDrinksFitLiverConscious",
  "shouldIDrinkMoreExercisingHeat",
] as const;

export function HydrationEducation() {
  const t = useTranslations("nutrition.hydrationEducation");
  const [openTopic, setOpenTopic] = useState<string | null>(null);

  return (
    <section className="rounded-card border border-surface bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <BookOpen size={18} className="text-muted" />
        <h3 className="text-sm font-semibold text-secondary">{t("title")}</h3>
      </div>
      <div className="flex flex-col divide-y divide-surface">
        {TOPICS.map((topic) => {
          const isOpen = openTopic === topic;
          return (
            <div key={topic} className="py-2 first:pt-0 last:pb-0">
              <button
                type="button"
                onClick={() => setOpenTopic(isOpen ? null : topic)}
                aria-expanded={isOpen}
                className="flex min-h-11 w-full items-center justify-between gap-2 text-left text-sm font-medium text-secondary"
              >
                {t(`topics.${topic}.question`)}
                <ChevronDown size={16} className={`shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && <p className="mt-1 text-sm text-muted">{t(`topics.${topic}.answer`)}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
