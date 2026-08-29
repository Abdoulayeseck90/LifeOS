import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { getTestDefinition, listLabResultsByTestDefinition, listReferenceRangesForTest } from "@/services/health/labs";
import { getDocument } from "@/services/core/documents";
import { resolveDateRangeParams } from "@/lib/dates/server-range";
import { DateRangeFilter } from "@/components/core/date-range-filter";
import { LabTrendChart, type LabTrendBand } from "@/components/health/lab-trend-chart";
import { LabResultHistoryTable } from "@/components/health/lab-result-history-table";
import { ReferenceRangeInfo } from "@/components/health/reference-range-info";
import { LabResultStatusBadge } from "@/components/health/lab-result-status-badge";
import { DocumentViewLink } from "@/components/health/document-view-link";
import type { LabResult } from "@/types/health/entities";

// One test, first-class (Redesign Lab Results Spec — the whole point of
// this route): latest result + reference range + status + trend +
// complete history + source document, all for a single test_definition.
// Deliberately a dedicated page, not a modal reused from the edit form
// (Section 3: "Do NOT simply open the edit form") — every other
// per-record view in this app is a modal, but "understand how this one
// test changed over time" genuinely needs its own page with its own
// URL/date-filter state. Per-user data behind auth — never statically
// prerendered.
export const dynamic = "force-dynamic";

export default async function LabTestHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; testDefinitionId: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { locale, testDefinitionId } = await params;
  const { dateRange } = await resolveDateRangeParams(await searchParams);
  const t = await getTranslations("labs");

  const [testDefinition, results, referenceRanges] = await Promise.all([
    getTestDefinition(testDefinitionId),
    listLabResultsByTestDefinition(testDefinitionId),
    listReferenceRangesForTest(testDefinitionId),
  ]);

  if (!testDefinition) notFound();

  const testName = (locale === "fr" ? testDefinition.name_fr : testDefinition.name_en) || t("unknownTest");

  // listLabResultsByTestDefinition already orders collection_date desc.
  const latest = results[0] as LabResult | undefined;
  const previous = results[1] as LabResult | undefined;

  const filteredResults = results.filter((result) => {
    if (dateRange.from && result.collection_date < dateRange.from) return false;
    if (dateRange.to && result.collection_date > dateRange.to) return false;
    return true;
  });

  // Trend chart: numeric-only, chronological order (Section 4). Only
  // ever rendered when there are >=2 numeric points.
  const numericEntries = [...results]
    .filter((result) => result.value_numeric !== null)
    .reverse()
    .map((result) => ({ date: result.collection_date, value: result.value_numeric as number }));

  // Reference Range Source System spec, Section 8: never draw a single
  // band that pretends to cover the whole history unless every
  // lab-provided range across these results actually agrees. If the
  // lab's own range changed over time, say so instead of guessing which
  // one applies to the chart as a whole.
  const labRanges = results.filter((r) => r.reference_low !== null || r.reference_high !== null);
  const distinctLabRanges = new Set(labRanges.map((r) => `${r.reference_low}-${r.reference_high}`));

  let band: LabTrendBand;
  if (distinctLabRanges.size === 1 && labRanges[0]) {
    band = { kind: "value", low: labRanges[0].reference_low, high: labRanges[0].reference_high, label: t("laboratoryReport") };
  } else if (distinctLabRanges.size > 1) {
    band = { kind: "changed", note: t("referenceRangeChangedNote") };
  } else if (referenceRanges.length === 1 && referenceRanges[0]) {
    const only = referenceRanges[0];
    band = { kind: "value", low: only.reference_low, high: only.reference_high, label: `${t("generalReferenceRange")} — ${only.source_name}` };
  } else {
    band = { kind: "none" };
  }

  const change =
    latest && previous && latest.value_numeric !== null && previous.value_numeric !== null
      ? Math.round((latest.value_numeric - previous.value_numeric) * 100) / 100
      : null;

  const sourceDocument = latest?.source_document_id ? await getDocument(latest.source_document_id) : null;

  return (
    <div>
      <Link href="/health/labs" className="mb-4 inline-flex min-h-11 items-center text-sm text-primary hover:underline">
        ← {t("backToLabResults")}
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-secondary">{testName}</h1>
        {testDefinition.description && <p className="mt-1 text-sm text-muted">{testDefinition.description}</p>}
      </div>

      {!latest ? (
        <div className="rounded-card border border-dashed border-surface p-8 text-center">
          <p className="text-sm text-muted">{t("noResultsForTest")}</p>
        </div>
      ) : (
        <>
          <section className="mb-8 rounded-card border border-surface bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("latestResult")}</p>
            <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
              <p className="text-3xl font-semibold text-secondary">
                {latest.value_numeric ?? latest.value_text}
                {latest.unit ? <span className="ml-1 text-lg font-normal text-muted">{latest.unit}</span> : null}
              </p>
              <LabResultStatusBadge result={latest} externalRanges={referenceRanges} />
            </div>
            <div className="mt-3">
              <ReferenceRangeInfo result={latest} externalRanges={referenceRanges} />
            </div>
            <p className="mt-3 text-sm text-muted">{latest.collection_date}</p>

            {(latest.facility || latest.ordering_provider) && (
              <div className="mt-4 flex flex-wrap gap-6 border-t border-surface pt-4 text-sm">
                {latest.facility && (
                  <div>
                    <p className="text-xs text-muted">{t("laboratory")}</p>
                    <p className="text-secondary">{latest.facility}</p>
                  </div>
                )}
                {latest.ordering_provider && (
                  <div>
                    <p className="text-xs text-muted">{t("form.orderingProvider")}</p>
                    <p className="text-secondary">{latest.ordering_provider}</p>
                  </div>
                )}
              </div>
            )}
            {latest.notes && (
              <div className="mt-4 border-t border-surface pt-4 text-sm">
                <p className="text-xs text-muted">{t("form.notes")}</p>
                <p className="whitespace-pre-wrap text-secondary">{latest.notes}</p>
              </div>
            )}
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t("compare")}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-card border border-surface bg-white p-4">
                <p className="text-xs text-muted">{t("latestResult")}</p>
                <p className="mt-1 text-lg font-semibold text-secondary">
                  {latest.value_numeric ?? latest.value_text}
                  {latest.unit ? ` ${latest.unit}` : ""}
                </p>
              </div>
              <div className="rounded-card border border-surface bg-white p-4">
                <p className="text-xs text-muted">{t("previous")}</p>
                <p className="mt-1 text-lg font-semibold text-secondary">
                  {previous ? `${previous.value_numeric ?? previous.value_text}${previous.unit ? ` ${previous.unit}` : ""}` : t("noPreviousResult")}
                </p>
              </div>
              <div className="rounded-card border border-surface bg-white p-4">
                <p className="text-xs text-muted">{t("change")}</p>
                <p className="mt-1 text-lg font-semibold text-secondary">
                  {change !== null ? `${change > 0 ? "+" : ""}${change}${latest.unit ? ` ${latest.unit}` : ""}` : "—"}
                </p>
              </div>
            </div>
          </section>

          {numericEntries.length >= 2 && (
            <section className="mb-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t("trend")}</h2>
              <LabTrendChart entries={numericEntries} unit={latest.unit ?? ""} band={band} />
            </section>
          )}

          {sourceDocument && (
            <section className="mb-8 rounded-card border border-surface bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("sourceDocument")}</p>
              <p className="mt-2 text-sm text-secondary">{sourceDocument.name}</p>
              <div className="mt-2">
                <DocumentViewLink documentId={sourceDocument.id} />
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t("historyTitle")}</h2>
            <DateRangeFilter quickRanges={["today", "7d", "30d", "3m", "6m", "thisYear", "custom"]} />
            {filteredResults.length === 0 ? (
              <div className="rounded-card border border-dashed border-surface p-8 text-center">
                <p className="text-sm text-muted">{t("noFilterResults")}</p>
              </div>
            ) : (
              <LabResultHistoryTable results={filteredResults} externalRanges={referenceRanges} />
            )}
          </section>
        </>
      )}
    </div>
  );
}
