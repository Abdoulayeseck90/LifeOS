"use client";

import { useTranslations } from "next-intl";
import { RecordFormModal } from "@/components/core/record-form-modal";
import { MonitoringItemForm } from "@/components/health/monitoring-item-form";
import type { Guideline } from "@/types/health/entities";

// Per-plan secondary action (not the page's primary action, which is
// "Add Monitoring Plan" — see monitoring-plan-add-button.tsx), so this
// uses the smaller text-link trigger style already established by the
// Edit/Delete row in *-card.tsx components rather than AddRecordButton.
export function MonitoringItemAddButton({ planId, guidelines }: { planId: string; guidelines: Guideline[] }) {
  const t = useTranslations("monitoring");

  return (
    <RecordFormModal
      trigger={(open) => (
        <button type="button" onClick={open} className="text-xs text-primary hover:underline">
          + {t("itemForm.addButton")}
        </button>
      )}
      modalTitle={t("itemForm.title")}
    >
      {(modalProps) => <MonitoringItemForm planId={planId} guidelines={guidelines} {...modalProps} />}
    </RecordFormModal>
  );
}
