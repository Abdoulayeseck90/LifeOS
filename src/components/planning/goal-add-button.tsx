"use client";

import { useTranslations } from "next-intl";
import type { Business, Project } from "@/types/core/entities";
import { AddRecordButton } from "@/components/core/add-record-button";
import { GoalForm } from "@/components/planning/goal-form";

export function GoalAddButton({ projects, businesses }: { projects: Project[]; businesses: Business[] }) {
  const t = useTranslations("planning.goals");

  return (
    <AddRecordButton label={t("addButton")} modalTitle={t("addTitle")}>
      {(modalProps) => <GoalForm projects={projects} businesses={businesses} {...modalProps} />}
    </AddRecordButton>
  );
}
