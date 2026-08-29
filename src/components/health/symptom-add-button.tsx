"use client";

import { useTranslations } from "next-intl";
import { AddRecordButton } from "@/components/core/add-record-button";
import { SymptomForm } from "@/components/health/symptom-form";
import type { Condition } from "@/types/health/entities";

export function SymptomAddButton({ conditions }: { conditions: Condition[] }) {
  const t = useTranslations("symptoms");

  return (
    <AddRecordButton label={t("addButton")} modalTitle={t("form.title")}>
      {(modalProps) => <SymptomForm conditions={conditions} {...modalProps} />}
    </AddRecordButton>
  );
}
