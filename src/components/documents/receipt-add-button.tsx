"use client";

import { useTranslations } from "next-intl";
import { ReceiptText } from "lucide-react";
import type { FinanceTransaction } from "@/types/core/entities";
import { RecordFormModal } from "@/components/core/record-form-modal";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";

// Secondary action alongside DocumentAddButton's primary "Upload
// Document" (Section 66) — same unified upload form, just pre-seeded
// with document_type = "receipt" (Section 70).
export function ReceiptAddButton({ unlinkedExpenses }: { unlinkedExpenses: FinanceTransaction[] }) {
  const t = useTranslations("personalDocuments");

  return (
    <RecordFormModal
      trigger={(open) => (
        <button
          type="button"
          onClick={open}
          className="inline-flex min-h-11 items-center gap-1.5 rounded border border-surface px-4 py-2 text-sm font-medium text-secondary hover:bg-surface"
        >
          <ReceiptText size={16} />+ {t("addReceipt")}
        </button>
      )}
      modalTitle={t("addReceipt")}
    >
      {(modalProps) => <DocumentUploadForm initialDocumentType="receipt" unlinkedExpenses={unlinkedExpenses} {...modalProps} />}
    </RecordFormModal>
  );
}
