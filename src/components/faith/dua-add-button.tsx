"use client";

import { useTranslations } from "next-intl";
import { AddRecordButton } from "@/components/core/add-record-button";
import { DuaForm } from "@/components/faith/dua-form";

export function DuaAddButton() {
  const t = useTranslations("faith.dua");

  return (
    <AddRecordButton label={t("addDua")} modalTitle={t("addDua")}>
      {(modalProps) => <DuaForm {...modalProps} />}
    </AddRecordButton>
  );
}
