import { getTranslations } from "next-intl/server";
import { listDiagnosticTests } from "@/services/health/diagnostic-tests";
import { listConditions } from "@/services/health/conditions";
import { listDocuments } from "@/services/core/documents";
import { resolveDateRangeParams } from "@/lib/dates/server-range";
import { DateRangeFilter } from "@/components/core/date-range-filter";
import { DiagnosticTestAddButton } from "@/components/health/diagnostic-test-add-button";
import { DiagnosticTestSavedBanner } from "@/components/health/diagnostic-test-saved-banner";
import { DiagnosticTestCategoryBrowser } from "@/components/health/diagnostic-test-category-browser";
import { DiagnosticTestHistory } from "@/components/health/diagnostic-test-history";

// One page, five categories switched client-side — not five separate
// routes (Spec: "Do NOT create separate sidebar pages for each
// diagnostic category"). FibroScan records still live under Imaging
// here; the standalone /health/diagnostic-tests/fibroscan comparison
// view (Addendum Section 3) still exists and still works, just without
// its own link from this header per the user's request. Per-user data
// behind auth — never statically prerendered.
export const dynamic = "force-dynamic";

export default async function DiagnosticTestsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const t = await getTranslations("diagnosticTests");
  const { dateRange } = await resolveDateRangeParams(await searchParams);
  const [diagnosticTests, conditions, documents] = await Promise.all([
    listDiagnosticTests(undefined, dateRange),
    listConditions(),
    listDocuments(),
  ]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-secondary">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </div>
        <DiagnosticTestAddButton conditions={conditions} documents={documents} />
      </div>

      <DateRangeFilter quickRanges={["30d", "3m", "6m", "thisYear", "custom"]} />

      <DiagnosticTestSavedBanner />

      <DiagnosticTestCategoryBrowser tests={diagnosticTests} conditions={conditions} documents={documents} />

      <DiagnosticTestHistory tests={diagnosticTests} conditions={conditions} documents={documents} />
    </div>
  );
}
