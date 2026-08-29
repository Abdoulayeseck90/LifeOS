"use client";

import { useTranslations } from "next-intl";
import { AddRecordButton } from "@/components/core/add-record-button";
import { AppointmentForm } from "@/components/health/appointment-form";
import type { Condition } from "@/types/health/entities";

// Thin client-side glue: a Server Component can pass plain data
// (conditions) across the boundary but never a function, so the
// render-prop `children` that AddRecordButton needs has to be built
// here in client code, not inline in the server page.
export function AppointmentAddButton({ conditions }: { conditions: Condition[] }) {
  const t = useTranslations("appointments");

  return (
    <AddRecordButton label={t("addButton")} modalTitle={t("form.title")}>
      {(modalProps) => <AppointmentForm conditions={conditions} {...modalProps} />}
    </AddRecordButton>
  );
}
