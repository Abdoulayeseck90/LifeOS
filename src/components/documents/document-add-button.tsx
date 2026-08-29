"use client";

import { useTranslations } from "next-intl";
import type { FinanceTransaction } from "@/types/core/entities";
import { AddRecordButton } from "@/components/core/add-record-button";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";

export function DocumentAddButton({ unlinkedExpenses }: { unlinkedExpenses: FinanceTransaction[] }) {
  const t = useTranslations("personalDocuments");

  return (
    <AddRecordButton label={t("uploadDocument")} modalTitle={t("uploadDocument")}>
      {(modalProps) => <DocumentUploadForm unlinkedExpenses={unlinkedExpenses} {...modalProps} />}
    </AddRecordButton>
  );
}
