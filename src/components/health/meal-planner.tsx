"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarDays, ShoppingBasket, ChevronDown, ChevronUp } from "lucide-react";
import type { Meal, NutritionPreferences, ShoppingListCategory } from "@/types/health/entities";
import { generateWeeklyPlan, aggregateWeeklyPlanIngredients } from "@/lib/health/meal-planner";
import { MealDetailModal } from "@/components/health/meal-detail-modal";

// Redesign Nutrition spec, Section 8/19/22: "Preview only. [View Full
// Meal Plan]" on the main page — 2 days by default, the rest is one
// click away (expand in place rather than a separate route/modal, to
// avoid layering a modal inside a page section). Cuisine/dislike
// preferences come from the shared Nutrition Preferences (Section 22:
// no duplicated preference forms) — this component just renders what
// generateWeeklyPlan() produces from them.
const PREVIEW_DAY_COUNT = 2;

export function MealPlanner({
  meals,
  preferences,
  onAddToShoppingList,
}: {
  meals: Meal[];
  preferences: NutritionPreferences | null;
  onAddToShoppingList: (items: { name: string; category: ShoppingListCategory; source: string }[]) => void;
}) {
  const t = useTranslations("nutrition.mealPlanner");
  const { locale } = useParams<{ locale: string }>();
  const isFr = locale === "fr";
  const [showFullWeek, setShowFullWeek] = useState(false);
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const plan = useMemo(
    () => generateWeeklyPlan(meals, { cuisinePreferences: preferences?.cuisine_preferences, dislikes: preferences?.dislikes }),
    [meals, preferences]
  );

  // Start the preview on today's weekday so it feels current rather
  // than always showing Monday.
  const todayIndex = useMemo(() => {
    const jsDay = new Date().getDay(); // 0 = Sunday
    return jsDay === 0 ? 6 : jsDay - 1; // align to PLAN_DAYS' Monday-start order
  }, []);
  const orderedPlan = useMemo(() => [...plan.slice(todayIndex), ...plan.slice(0, todayIndex)], [plan, todayIndex]);
  const visiblePlan = showFullWeek ? orderedPlan : orderedPlan.slice(0, PREVIEW_DAY_COUNT);

  function openMeal(id: string) {
    setSelectedMealId(id);
    setDetailOpen(true);
  }

  function handleGenerateShoppingList() {
    const items = aggregateWeeklyPlanIngredients(plan, locale ?? "en");
    onAddToShoppingList(items);
  }

  return (
    <section className="mb-8 rounded-card border border-surface bg-white p-4">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-muted" />
          <h2 className="text-sm font-semibold text-secondary">{t("title")}</h2>
        </div>
        <button
          type="button"
          onClick={handleGenerateShoppingList}
          className="inline-flex min-h-11 items-center gap-1.5 rounded border border-slate-300 px-3 py-2 text-xs font-medium text-secondary hover:bg-surface"
        >
          <ShoppingBasket size={14} />
          {t("generateShoppingList")}
        </button>
      </div>
      <p className="mb-4 text-xs text-muted">{t("exampleDisclaimer")}</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {visiblePlan.map((day) => (
          <div key={day.day} className="rounded-card border border-surface bg-white p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">{t(`days.${day.day}`)}</p>
            <div className="flex flex-col gap-2 text-xs">
              <MealSlot label={t("breakfast")} meal={day.breakfast} isFr={isFr} onOpen={openMeal} />
              <MealSlot label={t("lunch")} meal={day.lunch} isFr={isFr} onOpen={openMeal} />
              <MealSlot label={t("dinner")} meal={day.dinner} isFr={isFr} onOpen={openMeal} />
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowFullWeek((v) => !v)}
        className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        {showFullWeek ? t("showLess") : t("viewFullPlan")}
        {showFullWeek ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      <MealDetailModal meals={meals} initialMealId={selectedMealId} open={detailOpen} onOpenChange={setDetailOpen} onAddToShoppingList={onAddToShoppingList} />
    </section>
  );
}

function MealSlot({ label, meal, isFr, onOpen }: { label: string; meal: Meal | null; isFr: boolean; onOpen: (id: string) => void }) {
  if (!meal) return null;
  return (
    <div>
      <p className="font-medium text-muted">{label}</p>
      <button type="button" onClick={() => onOpen(meal.id)} className="min-h-11 text-left text-primary hover:underline">
        {isFr ? meal.name_fr : meal.name_en}
      </button>
    </div>
  );
}
