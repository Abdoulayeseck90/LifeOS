"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CircleCheck, ShoppingBasket } from "lucide-react";
import type { Meal, ShoppingListCategory } from "@/types/health/entities";
import { Modal } from "@/components/core/modal";
import { ClassificationBadge } from "@/components/health/classification-badge";
import { mealRatingToClassification } from "@/lib/health/classification";

// Senegal-Focused Liver-Conscious Nutrition spec, Section 14/15:
// full meal detail — ingredients, ESTIMATED nutrition (always labeled
// as such, never presented as measured fact — Section 24), traditional
// preparation, the liver-conscious adaptation checklist, foods to
// reduce, substitutions, and swap suggestions shown inline (clicking
// one re-renders this same modal with the swap's own detail, rather
// than closing and reopening). "Add to Meal Plan" is intentionally
// absent — the weekly plan is a static example, not a live per-user
// schedule in this pass (disclosed to the user).
function guessShoppingCategory(meal: Meal): ShoppingListCategory {
  if (meal.tags.includes("fish")) return "fish";
  if (meal.tags.includes("chicken") || meal.tags.includes("eggs")) return "protein";
  if (meal.tags.includes("legume")) return "legumes";
  if (meal.tags.includes("whole_grain")) return "grains";
  return "other";
}

export function MealDetailModal({
  meals,
  initialMealId,
  open,
  onOpenChange,
  onAddToShoppingList,
}: {
  meals: Meal[];
  initialMealId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToShoppingList: (items: { name: string; category: ShoppingListCategory; source: string }[]) => void;
}) {
  const t = useTranslations("nutrition.mealDetail");
  const { locale } = useParams<{ locale: string }>();
  const [currentMealId, setCurrentMealId] = useState(initialMealId);

  useEffect(() => {
    if (open) setCurrentMealId(initialMealId);
  }, [open, initialMealId]);

  const meal = meals.find((m) => m.id === currentMealId);
  if (!meal) return null;

  const isFr = locale === "fr";
  const name = isFr ? meal.name_fr : meal.name_en;
  const description = isFr ? meal.description_fr : meal.description_en;
  const servingSize = isFr ? meal.serving_size_fr : meal.serving_size_en;
  const preparation = isFr ? meal.preparation_fr : meal.preparation_en;
  const ratingReason = isFr ? meal.rating_reason_fr : meal.rating_reason_en;
  const swapMeals = meal.suggested_swap_meal_ids.map((id) => meals.find((m) => m.id === id)).filter((m): m is Meal => !!m);

  function handleAddToShoppingList() {
    const items = meal!.ingredients.map((ingredient) => ({
      name: isFr ? ingredient.fr : ingredient.en,
      category: guessShoppingCategory(meal!),
      source: name,
    }));
    onAddToShoppingList(items);
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={name}>
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <ClassificationBadge classification={mealRatingToClassification(meal.rating)} />
          </div>
          {description && <p className="mt-2 text-sm text-secondary">{description}</p>}
          {servingSize && <p className="mt-1 text-xs text-muted">{t("servingSize")}: {servingSize}</p>}
        </div>

        {ratingReason && (
          <div className="rounded-card border border-surface bg-surface/50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("why")}</p>
            <p className="mt-1 text-sm text-secondary">{ratingReason}</p>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("ingredients")}</p>
          <ul className="mt-1.5 flex flex-col gap-1 text-sm text-secondary">
            {meal.ingredients.map((ingredient, i) => (
              <li key={i}>• {isFr ? ingredient.fr : ingredient.en}</li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("nutrition")}</p>
          <p className="mt-1 text-xs text-muted">{t("nutritionEstimateNote")}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {meal.calories_kcal !== null && <NutrientStat label={t("calories")} value={`~${meal.calories_kcal} kcal`} />}
            {meal.protein_g !== null && <NutrientStat label={t("protein")} value={`~${meal.protein_g} g`} />}
            {meal.carbs_g !== null && <NutrientStat label={t("carbs")} value={`~${meal.carbs_g} g`} />}
            {meal.fat_g !== null && <NutrientStat label={t("fat")} value={`~${meal.fat_g} g`} />}
            {meal.fiber_g !== null && <NutrientStat label={t("fiber")} value={`~${meal.fiber_g} g`} />}
            {meal.sugar_g !== null && <NutrientStat label={t("sugar")} value={`~${meal.sugar_g} g`} />}
            {meal.sodium_mg !== null && <NutrientStat label={t("sodium")} value={`~${meal.sodium_mg} mg`} />}
          </div>
        </div>

        {preparation && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("preparation")}</p>
            <p className="mt-1 text-sm text-secondary">{preparation}</p>
          </div>
        )}

        {meal.liver_conscious_preparation.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("liverConsciousPreparation")}</p>
            <ul className="mt-1.5 flex flex-col gap-1 text-sm text-secondary">
              {meal.liver_conscious_preparation.map((tip, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <CircleCheck size={14} className="mt-0.5 shrink-0 text-status-normal" />
                  {isFr ? tip.fr : tip.en}
                </li>
              ))}
            </ul>
          </div>
        )}

        {meal.foods_to_reduce.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("foodsToReduce")}</p>
            <ul className="mt-1.5 flex flex-col gap-1 text-sm text-secondary">
              {meal.foods_to_reduce.map((item, i) => (
                <li key={i}>• {isFr ? item.fr : item.en}</li>
              ))}
            </ul>
          </div>
        )}

        {meal.substitutions.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("substitutions")}</p>
            <ul className="mt-1.5 flex flex-col gap-1 text-sm text-secondary">
              {meal.substitutions.map((item, i) => (
                <li key={i}>• {isFr ? item.fr : item.en}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={handleAddToShoppingList}
          className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded border border-slate-300 px-4 py-2 text-sm font-medium text-secondary hover:bg-surface"
        >
          <ShoppingBasket size={16} />
          {t("addToShoppingList")}
        </button>

        {swapMeals.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("swapWith")}</p>
            <div className="mt-2 flex flex-col gap-2">
              {swapMeals.map((swap) => (
                <button
                  key={swap.id}
                  type="button"
                  onClick={() => setCurrentMealId(swap.id)}
                  className="flex min-h-11 items-center justify-between rounded border border-surface px-3 py-2 text-left text-sm text-secondary hover:bg-surface"
                >
                  {isFr ? swap.name_fr : swap.name_en}
                  <ClassificationBadge classification={mealRatingToClassification(swap.rating)} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function NutrientStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-surface p-2 text-center">
      <p className="text-sm font-semibold text-secondary">{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}
