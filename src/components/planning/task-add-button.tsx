"use client";

import { useTranslations } from "next-intl";
import type { Business, Goal, Project } from "@/types/core/entities";
import { AddRecordButton } from "@/components/core/add-record-button";
import { TaskForm } from "@/components/planning/task-form";

export function TaskAddButton({ projects, goals, businesses }: { projects: Project[]; goals: Goal[]; businesses: Business[] }) {
  const t = useTranslations("planning.tasks");

  return (
    <AddRecordButton label={t("addButton")} modalTitle={t("addTitle")}>
      {(modalProps) => <TaskForm projects={projects} goals={goals} businesses={businesses} {...modalProps} />}
    </AddRecordButton>
  );
}
