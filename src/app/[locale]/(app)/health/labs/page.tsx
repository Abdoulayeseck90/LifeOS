import { getTranslations } from "next-intl/server";
import { listLabResults, listTestDefinitions, listAllReferenceRanges } from "@/services/health/labs";
import { resolveDateRangeParams } from "@/lib/dates/server-range";
import { DateRangeFilter } from "@/components/core/date-range-filter";
import { LabResultsFilters } from "@/components/health/lab-results-filters";
import { LabResultAddButton } from "@/components/health/lab-result-add-button";

// Data-first (Global Data-Entry UX Refactor, Section 12): the form no
// longer lives on the page — it opens in a modal via the primary action
// button next to the title. Per-user data behind auth — never
// statically prerendered.
export const dynamic = "force-dynamic";

export default async function LabsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const t = await getTranslations("labs");
  const { dateRange } = await resolveDateRangeParams(await searchParams);
  const [labResults, testDefinitions, referenceRanges] = await Promise.all([
    listLabResults(dateRange),
    listTestDefinitions(),
    listAllReferenceRanges(),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-secondary">{t("title")}</h1>
        <LabResultAddButton testDefinitions={testDefinitions} />
      </div>

      <DateRangeFilter quickRanges={["30d", "3m", "6m", "thisYear", "custom"]} />

      {labResults.length === 0 ? (
        <div className="rounded-card border border-dashed border-surface p-8 text-center">
          <p className="text-sm text-muted">{t("empty")}</p>
        </div>
      ) : (
        <LabResultsFilters results={labResults} testDefinitions={testDefinitions} referenceRanges={referenceRanges} />
      )}
    </div>
  );
}
