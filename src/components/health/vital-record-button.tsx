"use client";

import { useTranslations } from "next-intl";
import type { Condition, Appointment } from "@/types/health/entities";
import type { Document } from "@/types/core/entities";
import { AddRecordButton } from "@/components/core/add-record-button";
import { RecordVitalsForm } from "@/components/health/record-vitals-form";

// The one "+ Record Vitals" button for the whole Vitals page (Spec
// Section 3/4) — opens the combined multi-measurement form (any subset
// of Blood Pressure/Heart Rate/Temperature/Respiratory Rate/SpO2/
// Weight/Height from one visit, submitted together). Editing a single
// already-saved reading still uses each type's own dedicated form,
// reached from its History row.
export function VitalRecordButton({
  conditions,
  documents,
  appointments,
}: {
  conditions: Condition[];
  documents: Document[];
  appointments: Appointment[];
}) {
  const t = useTranslations("vitals");

  return (
    <AddRecordButton label={t("recordButton")} modalTitle={t("form.title")}>
      {(modalProps) => (
        <RecordVitalsForm conditions={conditions} documents={documents} appointments={appointments} {...modalProps} />
      )}
    </AddRecordButton>
  );
}
