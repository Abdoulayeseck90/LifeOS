"use client";

import { useTranslations } from "next-intl";
import { AddRecordButton } from "@/components/core/add-record-button";
import { ConditionForm } from "@/components/health/condition-form";

// Thin client-side glue: see appointment-add-button.tsx for why this
// wrapper exists (a Server Component can't pass the render-prop
// children function directly).
export function ConditionAddButton() {
  const t = useTranslations("conditions");

  return (
    <AddRecordButton label={t("addButton")} modalTitle={t("form.title")}>
      {(modalProps) => <ConditionForm {...modalProps} />}
    </AddRecordButton>
  );
}
