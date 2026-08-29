"use client";

import { useTranslations } from "next-intl";
import type { Business } from "@/types/core/entities";
import { AddRecordButton } from "@/components/core/add-record-button";
import { BillForm } from "@/components/finance/bill-form";

export function BillAddButton({ businesses }: { businesses: Business[] }) {
  const t = useTranslations("finance.bills");

  return (
    <AddRecordButton label={t("addButton")} modalTitle={t("addTitle")}>
      {(modalProps) => <BillForm businesses={businesses} {...modalProps} />}
    </AddRecordButton>
  );
}
