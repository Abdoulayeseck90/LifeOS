"use client";

import { useTranslations } from "next-intl";
import { AddRecordButton } from "@/components/core/add-record-button";
import { BusinessForm } from "@/components/planning/business-form";

export function BusinessAddButton() {
  const t = useTranslations("planning.businesses");

  return (
    <AddRecordButton label={t("addButton")} modalTitle={t("addTitle")}>
      {(modalProps) => <BusinessForm {...modalProps} />}
    </AddRecordButton>
  );
}
