import { getTranslations } from "next-intl/server";
import { listSymptomEntries } from "@/services/health/symptoms";
import { listConditions } from "@/services/health/conditions";
import { resolveDateRangeParams } from "@/lib/dates/server-range";
import { DateRangeFilter } from "@/components/core/date-range-filter";
import { SymptomCard } from "@/components/health/symptom-card";
import { SymptomAddButton } from "@/components/health/symptom-add-button";

// Data-first page. Per-user data behind auth — never statically
// prerendered.
export const dynamic = "force-dynamic";

export default async function SymptomsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const t = await getTranslations("symptoms");
  const { utcBounds } = await resolveDateRangeParams(await searchParams);
  const [symptomEntries, conditions] = await Promise.all([listSymptomEntries(utcBounds), listConditions()]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-secondary">{t("title")}</h1>
        <SymptomAddButton conditions={conditions} />
      </div>

      <DateRangeFilter quickRanges={["7d", "30d", "3m", "6m", "custom"]} />

      {symptomEntries.length === 0 ? (
        <div className="rounded-card border border-dashed border-surface p-8 text-center">
          <p className="text-sm text-muted">{t("empty")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {symptomEntries.map((entry) => (
            <SymptomCard key={entry.id} entry={entry} conditions={conditions} />
          ))}
        </div>
      )}
    </div>
  );
}
