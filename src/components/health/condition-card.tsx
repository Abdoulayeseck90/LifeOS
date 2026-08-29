"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Condition } from "@/types/health/entities";
import { ConditionStatusBadge } from "@/components/health/condition-status-badge";
import { ConditionForm } from "@/components/health/condition-form";
import { ConditionDetail } from "@/components/health/condition-detail";
import { Modal } from "@/components/core/modal";
import { RecordFormModal } from "@/components/core/record-form-modal";
import { ConfirmDialog } from "@/components/core/confirm-dialog";

export function ConditionCard({ condition }: { condition: Condition }) {
  const t = useTranslations("conditions");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [detailOpen, setDetailOpen] = useState(false);

  async function handleDelete() {
    const response = await fetch(`/api/health/conditions/${condition.id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  }

  return (
    <div className="rounded-card border border-surface bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-secondary">{condition.name}</p>
          {condition.description && <p className="mt-1 text-sm text-muted">{condition.description}</p>}
        </div>
        <ConditionStatusBadge status={condition.status} />
      </div>

      {condition.diagnosis_date && (
        <p className="mt-2 text-xs text-muted">
          {t("diagnosisDate")}: {condition.diagnosis_date}
        </p>
      )}

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
          {(modalProps) => <ConditionForm condition={condition} {...modalProps} />}
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

      <Modal open={detailOpen} onOpenChange={setDetailOpen} title={condition.name}>
        <ConditionDetail condition={condition} />
      </Modal>
    </div>
  );
}
