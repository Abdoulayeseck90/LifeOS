"use client";

import { useTranslations } from "next-intl";
import { AddRecordButton } from "@/components/core/add-record-button";
import { NutritionRestrictionForm } from "@/components/health/nutrition-restriction-form";
import type { Condition } from "@/types/health/entities";

export function NutritionRestrictionAddButton({ conditions }: { conditions: Condition[] }) {
  const t = useTranslations("nutrition");

  return (
    <AddRecordButton label={t("addRestrictionButton")} modalTitle={t("restrictionForm.title")}>
      {(modalProps) => <NutritionRestrictionForm conditions={conditions} {...modalProps} />}
    </AddRecordButton>
  );
}
