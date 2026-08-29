"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Condition, Medication } from "@/types/health/entities";
import { MedicationStatusBadge } from "@/components/health/medication-status-badge";
import { MedicationForm } from "@/components/health/medication-form";
import { MedicationDetail } from "@/components/health/medication-detail";
import { Modal } from "@/components/core/modal";
import { RecordFormModal } from "@/components/core/record-form-modal";
import { ConfirmDialog } from "@/components/core/confirm-dialog";

export function MedicationCard({ medication, conditions }: { medication: Medication; conditions: Condition[] }) {
  const t = useTranslations("medications");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [detailOpen, setDetailOpen] = useState(false);

  async function handleDelete() {
    const response = await fetch(`/api/health/medications/${medication.id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  }

  return (
    <div className="rounded-card border border-surface bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-secondary">{medication.name}</p>
          {(medication.dose || medication.unit || medication.frequency) && (
            <p className="mt-1 text-sm text-muted">
              {[medication.dose, medication.unit].filter(Boolean).join(" ")}
              {medication.frequency ? ` · ${medication.frequency}` : ""}
            </p>
          )}
        </div>
        <MedicationStatusBadge status={medication.status} />
      </div>

      <div className="mt-3 flex gap-4">
        <button type="button" onClick={() => setDetailOpen(true)} className="text-xs text-primary hover:underline">
          {tCommon("view")}
        </button>

        <RecordFormModal
          trigger={(open) => (
            <button type="button" onClick={open} className="text-xs text-primary hover:underline">
              {tCommon("edit")}
            </button>
          )}
          modalTitle={t("form.editTitle")}
        >
          {(modalProps) => <MedicationForm conditions={conditions} medication={medication} {...modalProps} />}
        </RecordFormModal>

        <ConfirmDialog
          trigger={(open) => (
            <button type="button" onClick={open} className="text-xs text-status-urgent hover:underline">
              {tCommon("delete")}
            </button>
          )}
          title={t("deleteConfirmTitle")}
          description={t("deleteConfirmMessage")}
          onConfirm={handleDelete}
        />
      </div>

      <Modal open={detailOpen} onOpenChange={setDetailOpen} title={medication.name}>
        <MedicationDetail medication={medication} />
      </Modal>
    </div>
  );
}
