"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/core/confirm-dialog";

export function MonitoringItemDeleteButton({ itemId }: { itemId: string }) {
  const t = useTranslations("monitoring");
  const tCommon = useTranslations("common");
  const router = useRouter();

  async function handleDelete() {
    const response = await fetch(`/api/health/monitoring/items/${itemId}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  }

  return (
    <ConfirmDialog
      trigger={(open) => (
        <button type="button" onClick={open} className="rounded border border-surface px-3 py-1 text-xs text-status-urgent">
          {tCommon("delete")}
        </button>
      )}
      title={t("deleteItemConfirmTitle")}
      description={t("deleteItemConfirmMessage")}
      onConfirm={handleDelete}
    />
  );
}
