"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { MealLogEntry } from "@/types/health/entities";
import { MealLogForm } from "@/components/health/meal-log-form";
import { RecordFormModal } from "@/components/core/record-form-modal";
import { ConfirmDialog } from "@/components/core/confirm-dialog";

export function MealLogCard({ entry }: { entry: MealLogEntry }) {
  const t = useTranslations("nutrition");
  const tCommon = useTranslations("common");
  const router = useRouter();

  async function handleDelete() {
    const response = await fetch(`/api/health/nutrition/meals/${entry.id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  }

  return (
    <div className="rounded-card border border-surface bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <p className="font-medium text-secondary">{entry.description}</p>
        <span className="rounded bg-surface px-2 py-0.5 text-xs font-medium text-muted">
          {t(`mealType.${entry.meal_type}`)}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted">{entry.date}</p>
      {entry.notes && <p className="mt-1 text-sm text-muted">{entry.notes}</p>}

      <div className="mt-3 flex gap-4">
        <RecordFormModal
          trigger={(open) => (
            <button type="button" onClick={open} className="text-xs text-primary hover:underline">
              {tCommon("edit")}
            </button>
          )}
          modalTitle={t("mealForm.editTitle")}
        >
          {(modalProps) => <MealLogForm mealLogEntry={entry} {...modalProps} />}
        </RecordFormModal>
        <ConfirmDialog
          trigger={(open) => (
            <button type="button" onClick={open} className="text-xs text-status-urgent hover:underline">
              {tCommon("delete")}
            </button>
          )}
          title={t("mealForm.deleteConfirmTitle")}
          description={t("mealForm.deleteConfirmMessage")}
          onConfirm={handleDelete}
        />
      </div>
    </div>
  );
}
