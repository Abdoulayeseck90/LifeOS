"use client";

import { useTranslations } from "next-intl";
import { AddRecordButton } from "@/components/core/add-record-button";
import { DiagnosticTestRecordForm } from "@/components/health/diagnostic-test-record-form";
import type { Condition } from "@/types/health/entities";
import type { Document } from "@/types/core/entities";

// The single "+ Add Diagnostic Test" entry point (Spec Section 4) —
// opens the category-picker-then-form flow, not a permanently-visible
// form and not five separate add buttons per category.
export function DiagnosticTestAddButton({
  conditions,
  documents,
}: {
  conditions: Condition[];
  documents: Document[];
}) {
  const t = useTranslations("diagnosticTests");

  return (
    <AddRecordButton label={t("addButton")} modalTitle={t("form.title")}>
      {(modalProps) => <DiagnosticTestRecordForm conditions={conditions} documents={documents} {...modalProps} />}
    </AddRecordButton>
  );
}
