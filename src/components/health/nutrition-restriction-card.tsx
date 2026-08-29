"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Condition, NutritionRestriction } from "@/types/health/entities";
import { NutritionRestrictionForm } from "@/components/health/nutrition-restriction-form";
import { RecordFormModal } from "@/components/core/record-form-modal";
import { ConfirmDialog } from "@/components/core/confirm-dialog";

export function NutritionRestrictionCard({
  restriction,
  conditions,
}: {
  restriction: NutritionRestriction;
  conditions: Condition[];
}) {
  const t = useTranslations("nutrition");
  const tCommon = useTranslations("common");
  const router = useRouter();

  async function handleDelete() {
    const response = await fetch(`/api/health/nutrition/restrictions/${restriction.id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  }

  return (
    <div className="flex items-center justify-between rounded-card border border-surface bg-white p-4">
      <div>
        <p className="font-medium text-secondary">{restriction.restriction}</p>
        <span className="rounded bg-surface px-2 py-0.5 text-xs font-medium text-muted">
          {t(`source.${restriction.source}`)}
        </span>
      </div>
      <div className="flex gap-4">
        <RecordFormModal
          trigger={(open) => (
            <button type="button" onClick={open} className="text-xs text-primary hover:underline">
              {tCommon("edit")}
            </button>
          )}
          modalTitle={t("restrictionForm.editTitle")}
        >
          {(modalProps) => (
            <NutritionRestrictionForm conditions={conditions} restriction={restriction} {...modalProps} />
          )}
        </RecordFormModal>
        <ConfirmDialog
          trigger={(open) => (
            <button type="button" onClick={open} className="text-xs text-status-urgent hover:underline">
              {tCommon("delete")}
            </button>
          )}
          title={t("restrictionForm.deleteConfirmTitle")}
          description={t("restrictionForm.deleteConfirmMessage")}
          onConfirm={handleDelete}
        />
      </div>
    </div>
  );
}
