"use client";

import { useTranslations } from "next-intl";
import { AddRecordButton } from "@/components/core/add-record-button";
import { MedicationForm } from "@/components/health/medication-form";
import type { Condition } from "@/types/health/entities";

export function MedicationAddButton({ conditions }: { conditions: Condition[] }) {
  const t = useTranslations("medications");

  return (
    <AddRecordButton label={t("addButton")} modalTitle={t("form.title")}>
      {(modalProps) => <MedicationForm conditions={conditions} {...modalProps} />}
    </AddRecordButton>
  );
}
