"use client";

import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { BodyMetric } from "@/types/health/entities";
import { BodyMetricForm } from "@/components/health/body-metric-form";
import { RecordFormModal } from "@/components/core/record-form-modal";
import { ConfirmDialog } from "@/components/core/confirm-dialog";

export function BodyMetricCard({ metric }: { metric: BodyMetric }) {
  const t = useTranslations("weight");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();

  async function handleDelete() {
    const response = await fetch(`/api/health/weight/${metric.id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  }

  return (
    <div className="flex items-center justify-between rounded-card border border-surface bg-white p-4">
      <div>
        <p className="font-medium text-secondary">{t(`metricType.${metric.metric_type}`)}</p>
        <p className="mt-1 text-sm text-muted">
          {new Date(metric.measured_at).toLocaleString(locale)}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <p className="text-lg font-semibold text-secondary">
          {metric.value} {metric.unit}
        </p>
        <RecordFormModal
          trigger={(open) => (
            <button type="button" onClick={open} className="inline-flex min-h-11 items-center text-xs text-primary hover:underline">
              {tCommon("edit")}
            </button>
          )}
          modalTitle={t("form.editTitle")}
        >
          {(modalProps) => <BodyMetricForm bodyMetric={metric} {...modalProps} />}
        </RecordFormModal>
        <ConfirmDialog
          trigger={(open) => (
            <button
              type="button"
              onClick={open}
              className="inline-flex min-h-11 items-center text-xs text-status-urgent hover:underline"
            >
              {tCommon("delete")}
            </button>
          )}
          title={t("deleteConfirmTitle")}
          description={t("deleteConfirmMessage")}
          onConfirm={handleDelete}
        />
      </div>
    </div>
  );
}
