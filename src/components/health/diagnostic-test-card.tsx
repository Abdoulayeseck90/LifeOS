"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Condition, DiagnosticTest } from "@/types/health/entities";
import type { Document } from "@/types/core/entities";
import { DiagnosticTestForm } from "@/components/health/diagnostic-test-form";
import { DiagnosticTestDetail } from "@/components/health/diagnostic-test-detail";
import { DIAGNOSTIC_CATEGORY_ICON } from "@/components/health/diagnostic-test-category-config";
import { Modal } from "@/components/core/modal";
import { RecordFormModal } from "@/components/core/record-form-modal";
import { ConfirmDialog } from "@/components/core/confirm-dialog";
import { FileText } from "lucide-react";

export function DiagnosticTestCard({
  test,
  conditions,
  documents,
}: {
  test: DiagnosticTest;
  conditions: Condition[];
  documents: Document[];
}) {
  const t = useTranslations("diagnosticTests");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [detailOpen, setDetailOpen] = useState(false);

  const category = test.category ?? "other";
  const Icon = DIAGNOSTIC_CATEGORY_ICON[category];
  const testLabel = t.has(`form.testTypeOptions.${test.test_type}`) ? t(`form.testTypeOptions.${test.test_type}`) : test.test_type;

  async function handleDelete() {
    const response = await fetch(`/api/health/diagnostic-tests/${test.id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  }

  return (
    <div className="rounded-card border border-surface bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Icon size={18} className="mt-0.5 shrink-0 text-primary" />
          <div>
            <p className="font-medium text-secondary">{testLabel}</p>
            <p className="text-xs text-muted">{t(`categories.${category}.label`)}</p>
            {test.body_part && <p className="mt-1 text-sm text-muted">{test.body_part}</p>}
            {test.facility && <p className="text-sm text-muted">{test.facility}</p>}
          </div>
        </div>
        <p className="shrink-0 text-sm text-muted">{test.study_date}</p>
      </div>

      {test.impression && <p className="mt-2 text-sm text-secondary">{test.impression}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => setDetailOpen(true)}
          className="inline-flex min-h-11 items-center text-xs text-primary hover:underline"
        >
          {t("viewDetails")}
        </button>

        <RecordFormModal
          trigger={(open) => (
            <button type="button" onClick={open} className="inline-flex min-h-11 items-center text-xs text-primary hover:underline">
              {tCommon("edit")}
            </button>
          )}
          modalTitle={t("form.editTitle")}
        >
          {(modalProps) => (
            <DiagnosticTestForm category={category} conditions={conditions} documents={documents} diagnosticTest={test} {...modalProps} />
          )}
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

        {test.source_document_id && (
          <span className="ml-auto flex items-center gap-1 text-xs text-muted">
            <FileText size={14} />
            {t("reportAvailable")}
          </span>
        )}
      </div>

      <Modal open={detailOpen} onOpenChange={setDetailOpen} title={testLabel}>
        <DiagnosticTestDetail
          test={test}
          conditions={conditions}
          documents={documents}
          onDeleted={() => {
            setDetailOpen(false);
            router.refresh();
          }}
        />
      </Modal>
    </div>
  );
}
