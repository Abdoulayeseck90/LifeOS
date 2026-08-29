"use client";

import { useTranslations } from "next-intl";
import type { Condition, DiagnosticTest } from "@/types/health/entities";
import type { Document } from "@/types/core/entities";
import { DiagnosticTestForm } from "@/components/health/diagnostic-test-form";
import { DocumentViewLink } from "@/components/health/document-view-link";
import { RecordFormModal } from "@/components/core/record-form-modal";
import { ConfirmDialog } from "@/components/core/confirm-dialog";

const MEASUREMENT_LABELS: Record<string, [string, string]> = {
  liver_stiffness_kpa: ["liverStiffness", "kPa"],
  cap_dbm: ["cap", "dB/m"],
  iqr: ["iqr", ""],
  iqr_median_percent: ["iqrMedianPercent", "%"],
  valid_measurements: ["validMeasurements", ""],
  total_measurements: ["totalMeasurements", ""],
  success_rate_percent: ["successRate", "%"],
};

// Spec Section 12: the detail view carries its own Edit/Delete (not
// just the card's) plus the associated report, following the existing
// document architecture (DocumentViewLink) rather than a second
// view/download mechanism.
export function DiagnosticTestDetail({
  test,
  conditions,
  documents,
  onDeleted,
}: {
  test: DiagnosticTest;
  conditions: Condition[];
  documents: Document[];
  onDeleted: () => void;
}) {
  const t = useTranslations("diagnosticTests");
  const tForm = useTranslations("diagnosticTests.form");
  const tCommon = useTranslations("common");

  const category = test.category ?? "other";
  const relatedCondition = conditions.find((c) => c.id === test.related_condition_id);

  async function handleDelete() {
    const response = await fetch(`/api/health/diagnostic-tests/${test.id}`, { method: "DELETE" });
    if (response.ok) onDeleted();
  }

  const fields: Array<[string, string | null]> = [
    [tForm("facility"), test.facility],
    [tForm("provider"), test.provider],
    [tForm(test.category === "microbiology" ? "specimenSource" : test.category === "pathology" ? "bodySite" : "bodyArea"), test.body_part],
    [tForm("indication"), test.indication],
    [tForm(test.category === "microbiology" ? "findingsResults" : "findings"), test.findings],
    [
      tForm(test.category === "pathology" ? "diagnosisImpression" : test.category === "other" ? "impressionResult" : "impression"),
      test.impression,
    ],
    [tForm("followUp"), test.follow_up],
    [t("relatedCondition"), relatedCondition?.name ?? null],
    [tForm("notes"), test.notes],
  ];

  const measurementEntries = Object.entries(test.measurements).filter(
    ([key, value]) => key in MEASUREMENT_LABELS && (typeof value === "number" || typeof value === "boolean")
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted">{tForm("studyDate")}</p>
          <p className="text-secondary">{test.study_date}</p>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {t(`categories.${category}.label`)}
        </span>
      </div>

      {measurementEntries.length > 0 && (
        <div className="rounded border border-surface bg-surface p-3">
          <p className="mb-2 text-xs font-medium text-muted">{tForm("fibroscanMeasurements")}</p>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {measurementEntries.map(([key, value]) => {
              const label = MEASUREMENT_LABELS[key];
              if (!label) return null;
              const [labelKey, unit] = label;
              return (
                <div key={key}>
                  <dt className="text-xs text-muted">{tForm(labelKey)}</dt>
                  <dd className="text-secondary">{typeof value === "boolean" ? (value ? tForm("fastingStatus") : "—") : `${value} ${unit}`}</dd>
                </div>
              );
            })}
          </dl>
        </div>
      )}

      {fields
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <div key={label}>
            <p className="text-xs text-muted">{label}</p>
            <p className="whitespace-pre-wrap text-secondary">{value}</p>
          </div>
        ))}

      {test.source_document_id && (
        <div>
          <p className="mb-1 text-xs text-muted">{t("associatedReport")}</p>
          <DocumentViewLink documentId={test.source_document_id} />
        </div>
      )}

      <div className="mt-2 flex gap-4 border-t border-surface pt-4">
        <RecordFormModal
          trigger={(open) => (
            <button type="button" onClick={open} className="inline-flex min-h-11 items-center text-sm text-primary hover:underline">
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
              className="inline-flex min-h-11 items-center text-sm text-status-urgent hover:underline"
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
