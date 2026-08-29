"use client";

import { useTranslations } from "next-intl";
import type { Business, Goal, Project } from "@/types/core/entities";
import { AddRecordButton } from "@/components/core/add-record-button";
import { NoteForm } from "@/components/planning/note-form";

export function NoteAddButton({ projects, goals, businesses }: { projects: Project[]; goals: Goal[]; businesses: Business[] }) {
  const t = useTranslations("notes");

  return (
    <AddRecordButton label={t("addButton")} modalTitle={t("addTitle")} variant="drawer">
      {(modalProps) => <NoteForm projects={projects} goals={goals} businesses={businesses} {...modalProps} />}
    </AddRecordButton>
  );
}
