"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { GlassWater, Target } from "lucide-react";
import { MealLogAddButton } from "@/components/health/meal-log-add-button";

// Redesign Nutrition spec, Overview tab: "[+ Add Meal] [+ Add Water]
// [Manage Goals]". Add Meal opens its own modal directly (tab
// -independent); Add Water / Manage Goals jump to the tab that owns
// that action (Water's logging UI, Goals' Edit Goals button) via the
// same ?tab= param NutritionTabs already reads, rather than
// duplicating interactive state up here.
export function NutritionQuickActions() {
  const t = useTranslations("nutrition.quickActions");
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function tabHref(tab: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    return `${pathname}?${params.toString()}`;
  }

  return (
    <section className="mb-8 flex flex-wrap gap-2">
      <MealLogAddButton />
      <Link
        href={tabHref("water")}
        className="inline-flex min-h-11 items-center gap-1.5 rounded border border-slate-300 px-4 py-2 text-sm font-medium text-secondary hover:bg-surface"
      >
        <GlassWater size={16} />
        {t("logWater")}
      </Link>
      <Link
        href={tabHref("goals")}
        className="inline-flex min-h-11 items-center gap-1.5 rounded border border-slate-300 px-4 py-2 text-sm font-medium text-secondary hover:bg-surface"
      >
        <Target size={16} />
        {t("manageGoals")}
      </Link>
    </section>
  );
}
