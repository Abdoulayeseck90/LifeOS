"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/i18n/navigation";
import type { TestDefinition, ReferenceStandard } from "@/types/health/entities";
import type { LabResultWithTest } from "@/services/health/labs";
import { LabResultForm } from "@/components/health/lab-result-form";
import { ReferenceRangeInfo } from "@/components/health/reference-range-info";
import { LabResultStatusBadge } from "@/components/health/lab-result-status-badge";
import { RecordFormModal } from "@/components/core/record-form-modal";
import { ConfirmDialog } from "@/components/core/confirm-dialog";

// Every result is a doorway into that TEST's full history (Redesign Lab
// Results Spec, Section 2/3) — clicking the test name or "View history"
// opens the dedicated /health/labs/[testDefinitionId] page, never the
// edit form and never a single-reading modal (that's what the old
// lab-result-detail.tsx modal did; removed — the history page is a
// strict superset of what it showed). Edit/Delete stay here for
// correcting this one specific reading.
export function LabResultCard({
  result,
  testDefinitions,
  referenceRanges,
}: {
  result: LabResultWithTest;
  testDefinitions: TestDefinition[];
  referenceRanges: ReferenceStandard[];
}) {
  const t = useTranslations("labs");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();

  const testName = (locale === "fr" ? result.test_definitions?.name_fr : result.test_definitions?.name_en) ?? t("unknownTest");
  const historyHref = `/health/labs/${result.test_definition_id}`;

  async function handleDelete() {
    const response = await fetch(`/api/health/labs/${result.id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  }

  return (
    <div className="rounded-card border border-surface bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href={historyHref} className="font-medium text-secondary hover:text-primary hover:underline">
            {testName}
          </Link>
          <div className="mt-1">
            <ReferenceRangeInfo result={result} externalRanges={referenceRanges} compact />
          </div>
          <p className="mt-1 text-sm text-muted">{result.collection_date}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-secondary">
            {result.value_numeric ?? result.value_text}
            {result.unit ? ` ${result.unit}` : ""}
          </p>
          <div className="mt-1">
            <LabResultStatusBadge result={result} externalRanges={referenceRanges} />
          </div>
        </div>
      </div>

      <div className="mt-3 flex gap-4">
        <Link
          href={historyHref}
          aria-label={t("viewHistoryFor", { test: testName })}
          className="inline-flex min-h-11 items-center text-xs font-medium text-primary hover:underline"
        >
          {t("viewHistory")} →
        </Link>

        <RecordFormModal
          trigger={(open) => (
            <button type="button" onClick={open} className="inline-flex min-h-11 items-center text-xs text-primary hover:underline">
              {tCommon("edit")}
            </button>
          )}
          modalTitle={t("form.editTitle")}
        >
          {(modalProps) => <LabResultForm testDefinitions={testDefinitions} labResult={result} {...modalProps} />}
        </RecordFormModal>

        <ConfirmDialog
          trigger={(open) => (
            <button type="button" onClick={open} className="inline-flex min-h-11 items-center text-xs text-status-urgent hover:underline">
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
