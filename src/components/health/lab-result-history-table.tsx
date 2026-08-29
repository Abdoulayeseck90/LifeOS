"use client";

import { useTranslations } from "next-intl";
import type { LabResult, ReferenceStandard } from "@/types/health/entities";
import { ReferenceRangeInfo } from "@/components/health/reference-range-info";
import { LabResultStatusBadge } from "@/components/health/lab-result-status-badge";

// Redesign Lab Results Spec, Section 10: a real table on desktop, and
// stacked cards on mobile rather than a squeezed/scrolling table
// (Section 22: "do not force desktop tables onto small screens").
// Receives an already date-filtered list — the caller decides which
// results are in scope (see labs/[testDefinitionId]/page.tsx).
//
// Reference Range Source System spec, Section 7: each row resolves
// ITS OWN reference range independently (via ReferenceRangeInfo/
// LabResultStatusBadge) — a result that has its own lab-provided range
// always shows that, never a later/external one, and a result with no
// lab range at all still only falls back to the external catalog for
// itself, never "the current lab range applied retroactively."
export function LabResultHistoryTable({ results, externalRanges }: { results: LabResult[]; externalRanges: ReferenceStandard[] }) {
  const t = useTranslations("labs");

  function resultValueText(result: LabResult): string {
    return String(result.value_numeric ?? result.value_text ?? "");
  }

  return (
    <div>
      <div className="hidden overflow-x-auto rounded-card border border-surface bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-surface text-xs text-muted">
              <th className="px-4 py-2">{t("historyColumns.date")}</th>
              <th className="px-4 py-2">{t("historyColumns.result")}</th>
              <th className="px-4 py-2">{t("historyColumns.unit")}</th>
              <th className="px-4 py-2">{t("historyColumns.referenceRange")}</th>
              <th className="px-4 py-2">{t("historyColumns.status")}</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={result.id} className="border-b border-surface last:border-0">
                <td className="px-4 py-2 text-secondary">{result.collection_date}</td>
                <td className="px-4 py-2 font-medium text-secondary">{resultValueText(result)}</td>
                <td className="px-4 py-2 text-secondary">{result.unit ?? "—"}</td>
                <td className="px-4 py-2">
                  <ReferenceRangeInfo result={result} externalRanges={externalRanges} compact />
                </td>
                <td className="px-4 py-2">
                  <LabResultStatusBadge result={result} externalRanges={externalRanges} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {results.map((result) => (
          <div key={result.id} className="rounded-card border border-surface bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-secondary">{result.collection_date}</p>
              <LabResultStatusBadge result={result} externalRanges={externalRanges} />
            </div>
            <p className="mt-1 text-lg font-semibold text-secondary">
              {resultValueText(result)}
              {result.unit ? ` ${result.unit}` : ""}
            </p>
            <div className="mt-1">
              <ReferenceRangeInfo result={result} externalRanges={externalRanges} compact />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
