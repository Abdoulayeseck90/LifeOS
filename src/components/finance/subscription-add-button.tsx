"use client";

import { useTranslations } from "next-intl";
import { AddRecordButton } from "@/components/core/add-record-button";
import { SubscriptionForm } from "@/components/finance/subscription-form";

export function SubscriptionAddButton() {
  const t = useTranslations("finance.subscriptions");

  return (
    <AddRecordButton label={t("addButton")} modalTitle={t("addTitle")}>
      {(modalProps) => <SubscriptionForm {...modalProps} />}
    </AddRecordButton>
  );
}
