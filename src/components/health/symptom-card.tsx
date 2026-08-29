"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Condition, SymptomEntry } from "@/types/health/entities";
import { SymptomForm } from "@/components/health/symptom-form";
import { SymptomDetail } from "@/components/health/symptom-detail";
import { Modal } from "@/components/core/modal";
import { RecordFormModal } from "@/components/core/record-form-modal";
import { ConfirmDialog } from "@/components/core/confirm-dialog";

export function SymptomCard({ entry, conditions }: { entry: SymptomEntry; conditions: Condition[] }) {
  const t = useTranslations("symptoms");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [detailOpen, setDetailOpen] = useState(false);

  async function handleDelete() {
    const response = await fetch(`/api/health/symptoms/${entry.id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  }

  return (
    <div className="rounded-card border border-surface bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <p className="font-medium text-secondary">{entry.symptom}</p>
        {entry.severity !== null && (
          <span className="rounded bg-status-attention/10 px-2 py-0.5 text-xs font-medium text-status-attention">
            {t("severity")}: {entry.severity}/10
          </span>
        )}
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
          {(modalProps) => <SymptomForm conditions={conditions} symptomEntry={entry} {...modalProps} />}
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

      <Modal open={detailOpen} onOpenChange={setDetailOpen} title={entry.symptom}>
        <SymptomDetail entry={entry} />
      </Modal>
    </div>
  );
}
