import { getTranslations } from "next-intl/server";
import { Wheat } from "lucide-react";
import { NUTRITION_TARGETS, WHO_HEALTHY_DIET_SOURCE } from "@/lib/health/nutrition-targets";

// Redesign Nutrition spec, Section 7 — fiber guidance, consolidated
// under Health & Nutrition Guidance.
export async function FiberInfo() {
  const t = await getTranslations("nutrition.fiberInfo");

  return (
    <div className="rounded-card border border-surface bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <Wheat size={18} className="text-muted" />
        <h3 className="text-sm font-semibold text-secondary">{t("title")}</h3>
      </div>
      <p className="text-lg font-semibold text-secondary">{NUTRITION_TARGETS.fiberG}+ g/day</p>
      <p className="mt-2 text-sm text-muted">{t("explanation")}</p>
      <p className="mt-3 text-xs text-muted">
        {t("source")}: {WHO_HEALTHY_DIET_SOURCE.name}
      </p>
    </div>
  );
}
