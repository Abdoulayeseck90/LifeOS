"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Food } from "@/types/health/entities";
import { Modal } from "@/components/core/modal";
import { ClassificationBadge } from "@/components/health/classification-badge";

// Redesign Nutrition spec, Section 17/6 — individual food detail:
// serving size, estimated nutrition, classification + the specific
// reason (never a bare badge with no explanation), and the
// preparation method when it's the reason the classification differs
// from the same food prepared another way (Section 6's fish example).
function NutrientStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-surface p-2 text-center">
      <p className="text-sm font-semibold text-secondary">{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}

export function FoodDetailModal({ food, open, onOpenChange }: { food: Food | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("nutrition.foodDetail");
  const { locale } = useParams<{ locale: string }>();
  const isFr = locale === "fr";

  if (!food) return null;

  const name = isFr ? food.name_fr : food.name_en;
  const servingSize = isFr ? food.serving_size_fr : food.serving_size_en;
  const preparation = isFr ? food.preparation_method_fr : food.preparation_method_en;
  const reason = isFr ? food.classification_reason_fr : food.classification_reason_en;

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={name}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <ClassificationBadge classification={food.classification} />
          <span className="text-xs text-muted">{t(`categories.${food.category}`)}</span>
        </div>

        {servingSize && (
          <p className="text-xs text-muted">
            {t("servingSize")}: {servingSize}
          </p>
        )}

        {reason && (
          <div className="rounded-card border border-surface bg-surface/50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("why")}</p>
            <p className="mt-1 text-sm text-secondary">{reason}</p>
          </div>
        )}

        {preparation && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("preparation")}</p>
            <p className="mt-1 text-sm text-secondary">{preparation}</p>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("nutrition")}</p>
          <p className="mt-1 text-xs text-muted">{t("nutritionEstimateNote")}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {food.calories_kcal !== null && <NutrientStat label={t("calories")} value={`~${food.calories_kcal} kcal`} />}
            {food.protein_g !== null && <NutrientStat label={t("protein")} value={`~${food.protein_g} g`} />}
            {food.carbs_g !== null && <NutrientStat label={t("carbs")} value={`~${food.carbs_g} g`} />}
            {food.fat_g !== null && <NutrientStat label={t("fat")} value={`~${food.fat_g} g`} />}
            {food.fiber_g !== null && <NutrientStat label={t("fiber")} value={`~${food.fiber_g} g`} />}
            {food.sugar_g !== null && <NutrientStat label={t("sugar")} value={`~${food.sugar_g} g`} />}
            {food.added_sugar_g !== null && <NutrientStat label={t("addedSugar")} value={`~${food.added_sugar_g} g`} />}
            {food.sodium_mg !== null && <NutrientStat label={t("sodium")} value={`~${food.sodium_mg} mg`} />}
            {food.saturated_fat_g !== null && <NutrientStat label={t("saturatedFat")} value={`~${food.saturated_fat_g} g`} />}
          </div>
        </div>
      </div>
    </Modal>
  );
}
