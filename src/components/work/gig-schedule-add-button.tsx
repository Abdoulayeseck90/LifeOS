"use client";

import { useTranslations } from "next-intl";
import { AddRecordButton } from "@/components/core/add-record-button";
import { AppointmentForm } from "@/components/calendar/appointment-form";
import type { Condition } from "@/types/health/entities";

// Same glue as AppointmentAddButton, but pre-set to category="work" so
// a shift schedule item starts in the right category — it's still the
// full Calendar appointment form underneath (Gig Driving spec: reuse
// Calendar, don't duplicate it), the user can still change category.
export function GigScheduleAddButton({ conditions }: { conditions: Condition[] }) {
  const t = useTranslations("gigDriving.schedule");

  return (
    <AddRecordButton label={t("addButton")} modalTitle={t("addButton")}>
      {(modalProps) => <AppointmentForm conditions={conditions} defaultCategory="work" {...modalProps} />}
    </AddRecordButton>
  );
}
