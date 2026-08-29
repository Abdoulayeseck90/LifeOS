"use client";

import { useTranslations } from "next-intl";
import type { Business } from "@/types/core/entities";
import { AddRecordButton } from "@/components/core/add-record-button";
import { ProjectForm } from "@/components/planning/project-form";

export function ProjectAddButton({ businesses }: { businesses: Business[] }) {
  const t = useTranslations("planning.projects");

  return (
    <AddRecordButton label={t("addButton")} modalTitle={t("addTitle")}>
      {(modalProps) => <ProjectForm businesses={businesses} {...modalProps} />}
    </AddRecordButton>
  );
}
