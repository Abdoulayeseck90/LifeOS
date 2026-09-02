import { getTranslations } from "next-intl/server";
import { listDocuments } from "@/services/core/documents";
import { listConditions } from "@/services/health/conditions";
import { listAppointments } from "@/services/health/appointments";
import { listLabResults } from "@/services/health/labs";
import { resolveDateRangeParams } from "@/lib/dates/server-range";
import { DateRangeFilter } from "@/components/core/date-range-filter";
import { DocumentAddButton } from "@/components/health/document-add-button";
import { DocumentCard } from "@/components/health/document-card";

// Per-user data behind auth — never statically prerendered.
export const dynamic = "force-dynamic";

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const t = await getTranslations("documents");
  const { dateRange } = await resolveDateRangeParams(await searchParams);
  const [documents, conditions, appointments, labResults] = await Promise.all([
    listDocuments(dateRange),
    listConditions(),
    listAppointments(),
    listLabResults(),
  ]);

  const hasActiveRange = Boolean(dateRange.from && dateRange.to);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold text-secondary">{t("title")}</h1>
        <DocumentAddButton conditions={conditions} appointments={appointments} labResults={labResults} />
      </div>

      <DateRangeFilter quickRanges={["30d", "3m", "6m", "thisYear", "custom"]} />

      {documents.length === 0 ? (
        <div className="rounded-card border border-dashed border-surface p-8 text-center">
          <p className="text-sm text-muted">{hasActiveRange ? t("noDateResults") : t("empty")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((document) => (
            <DocumentCard key={document.id} document={document} conditions={conditions} appointments={appointments} labResults={labResults} />
          ))}
        </div>
      )}
    </div>
  );
}
