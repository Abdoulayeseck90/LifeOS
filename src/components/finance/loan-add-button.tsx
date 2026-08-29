"use client";

import { useTranslations } from "next-intl";
import { AddRecordButton } from "@/components/core/add-record-button";
import { LoanForm } from "@/components/finance/loan-form";

export function LoanAddButton() {
  const t = useTranslations("finance.loans");

  return (
    <AddRecordButton label={t("addButton")} modalTitle={t("addTitle")}>
      {(modalProps) => <LoanForm {...modalProps} />}
    </AddRecordButton>
  );
}
