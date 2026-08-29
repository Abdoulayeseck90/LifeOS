"use client";

import { useTranslations } from "next-intl";
import { Settings } from "lucide-react";
import type { NutritionPreferences } from "@/types/health/entities";
import { RecordFormModal } from "@/components/core/record-form-modal";
import { NutritionPreferencesForm } from "@/components/health/nutrition-preferences-form";

export function NutritionPreferencesButton({ preferences }: { preferences: NutritionPreferences | null }) {
  const t = useTranslations("nutrition.preferencesForm");

  return (
    <RecordFormModal
      trigger={(open) => (
        <button
          type="button"
          onClick={open}
          className="inline-flex min-h-11 items-center gap-1.5 rounded border border-slate-300 px-3 py-2 text-sm font-medium text-secondary hover:bg-surface"
        >
          <Settings size={16} />
          {t("triggerLabel")}
        </button>
      )}
      modalTitle={t("title")}
    >
      {(modalProps) => <NutritionPreferencesForm preferences={preferences} {...modalProps} />}
    </RecordFormModal>
  );
}
