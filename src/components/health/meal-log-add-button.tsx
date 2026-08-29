"use client";

import { useTranslations } from "next-intl";
import { AddRecordButton } from "@/components/core/add-record-button";
import { MealLogForm } from "@/components/health/meal-log-form";

export function MealLogAddButton() {
  const t = useTranslations("nutrition");

  return (
    <AddRecordButton label={t("addMealButton")} modalTitle={t("mealForm.title")}>
      {(modalProps) => <MealLogForm {...modalProps} />}
    </AddRecordButton>
  );
}
