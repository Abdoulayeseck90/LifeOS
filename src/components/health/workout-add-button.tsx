"use client";

import { useTranslations } from "next-intl";
import { AddRecordButton } from "@/components/core/add-record-button";
import { WorkoutForm } from "@/components/health/workout-form";

// Thin client-side glue: see condition-add-button.tsx for why this
// wrapper exists. Modal, not permanently-visible form (Spec Section 8).
export function WorkoutAddButton() {
  const t = useTranslations("exercise");

  return (
    <AddRecordButton label={t("logWorkout")} modalTitle={t("form.title")}>
      {(modalProps) => <WorkoutForm {...modalProps} />}
    </AddRecordButton>
  );
}
