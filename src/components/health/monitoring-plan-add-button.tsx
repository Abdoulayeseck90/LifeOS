"use client";

import { useTranslations } from "next-intl";
import { AddRecordButton } from "@/components/core/add-record-button";
import { MonitoringPlanForm } from "@/components/health/monitoring-plan-form";
import type { Condition } from "@/types/health/entities";

// Thin client-side glue: see appointment-add-button.tsx for why this
// wrapper exists (a Server Component can't pass the render-prop
// children function directly).
export function MonitoringPlanAddButton({ conditions }: { conditions: Condition[] }) {
  const t = useTranslations("monitoring");

  return (
    <AddRecordButton label={t("addPlanButton")} modalTitle={t("planForm.title")}>
      {(modalProps) => <MonitoringPlanForm conditions={conditions} {...modalProps} />}
    </AddRecordButton>
  );
}
