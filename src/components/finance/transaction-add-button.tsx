"use client";

import { useTranslations } from "next-intl";
import type { Business, FinanceTransactionType, Project } from "@/types/core/entities";
import { AddRecordButton } from "@/components/core/add-record-button";
import { TransactionForm } from "@/components/finance/transaction-form";

export function TransactionAddButton({
  defaultType,
  defaultBusinessId,
  defaultProjectId,
  projects,
  businesses,
  label,
}: {
  defaultType?: FinanceTransactionType;
  defaultBusinessId?: string;
  defaultProjectId?: string;
  projects: Project[];
  businesses: Business[];
  label?: string;
}) {
  const t = useTranslations("finance.transactions");

  return (
    <AddRecordButton label={label ?? t("addButton")} modalTitle={t("addTitle")}>
      {(modalProps) => (
        <TransactionForm
          defaultType={defaultType}
          defaultBusinessId={defaultBusinessId}
          defaultProjectId={defaultProjectId}
          projects={projects}
          businesses={businesses}
          {...modalProps}
        />
      )}
    </AddRecordButton>
  );
}
