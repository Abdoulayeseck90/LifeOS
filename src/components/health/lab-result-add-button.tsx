"use client";

import { useTranslations } from "next-intl";
import { AddRecordButton } from "@/components/core/add-record-button";
import { LabResultForm } from "@/components/health/lab-result-form";
import type { TestDefinition } from "@/types/health/entities";

export function LabResultAddButton({ testDefinitions }: { testDefinitions: TestDefinition[] }) {
  const t = useTranslations("labs");

  return (
    <AddRecordButton label={t("addButton")} modalTitle={t("form.title")}>
      {(modalProps) => <LabResultForm testDefinitions={testDefinitions} {...modalProps} />}
    </AddRecordButton>
  );
}
