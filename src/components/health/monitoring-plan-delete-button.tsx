"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/core/confirm-dialog";

export function MonitoringPlanDeleteButton({ planId }: { planId: string }) {
  const t = useTranslations("monitoring");
  const tCommon = useTranslations("common");
  const router = useRouter();

  async function handleDelete() {
    const response = await fetch(`/api/health/monitoring/plans/${planId}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  }

  return (
    <ConfirmDialog
      trigger={(open) => (
        <button type="button" onClick={open} className="text-xs text-status-urgent hover:underline">
          {tCommon("delete")}
        </button>
      )}
      title={t("deletePlanConfirmTitle")}
      description={t("deletePlanConfirmMessage")}
      onConfirm={handleDelete}
    />
  );
}
