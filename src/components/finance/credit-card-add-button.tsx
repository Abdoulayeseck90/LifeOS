"use client";

import { useTranslations } from "next-intl";
import { AddRecordButton } from "@/components/core/add-record-button";
import { CreditCardForm } from "@/components/finance/credit-card-form";

export function CreditCardAddButton() {
  const t = useTranslations("finance.creditCards");

  return (
    <AddRecordButton label={t("addButton")} modalTitle={t("addTitle")}>
      {(modalProps) => <CreditCardForm {...modalProps} />}
    </AddRecordButton>
  );
}
