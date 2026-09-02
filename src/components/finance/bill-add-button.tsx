"use client";

import { useTranslations } from "next-intl";
import type { Business, CreditCard, Loan } from "@/types/core/entities";
import { AddRecordButton } from "@/components/core/add-record-button";
import { BillForm } from "@/components/finance/bill-form";

export function BillAddButton({ businesses, creditCards, loans }: { businesses: Business[]; creditCards: CreditCard[]; loans: Loan[] }) {
  const t = useTranslations("finance.bills");

  return (
    <AddRecordButton label={t("addButton")} modalTitle={t("addTitle")}>
      {(modalProps) => <BillForm businesses={businesses} creditCards={creditCards} loans={loans} {...modalProps} />}
    </AddRecordButton>
  );
}
