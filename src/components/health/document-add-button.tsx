"use client";

import { useTranslations } from "next-intl";
import { AddRecordButton } from "@/components/core/add-record-button";
import { DocumentUploadForm } from "@/components/health/document-upload-form";
import type { Condition, Appointment } from "@/types/health/entities";
import type { LabResultWithTest } from "@/services/health/labs";

// Thin client-side glue: see appointment-add-button.tsx for why this
// wrapper exists.
export function DocumentAddButton({
  conditions,
  appointments,
  labResults,
}: {
  conditions: Condition[];
  appointments: Appointment[];
  labResults: LabResultWithTest[];
}) {
  const t = useTranslations("documents");

  return (
    <AddRecordButton label={t("addButton")} modalTitle={t("form.title")}>
      {(modalProps) => (
        <DocumentUploadForm conditions={conditions} appointments={appointments} labResults={labResults} {...modalProps} />
      )}
    </AddRecordButton>
  );
}
