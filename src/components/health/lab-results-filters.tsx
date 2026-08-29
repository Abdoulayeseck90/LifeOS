"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { TestDefinition, LabCategory, ReferenceStandard } from "@/types/health/entities";
import type { LabResultWithTest } from "@/services/health/labs";
import { LabResultCard } from "@/components/health/lab-result-card";

const CATEGORIES: LabCategory[] = [
  "hepatitis_b",
  "liver",
  "kidney_renal",
  "blood_cbc",
  "metabolic",
  "thyroid",
  "iron_nutrition",
  "inflammation_immune",
  "pancreas",
  "cardiovascular",
  "other",
];

// Client-side filtering over the already-fetched full list — personal-
// scale data (Master Redesign Section 21: "only add [filters] where the
// amount of data justifies them," Section 8 explicitly asks for Lab
// Results specifically), no new API/round-trip needed.
export function LabResultsFilters({
  results,
  testDefinitions,
  referenceRanges,
}: {
  results: LabResultWithTest[];
  testDefinitions: TestDefinition[];
  referenceRanges: ReferenceStandard[];
}) {
  const t = useTranslations("labs");
  const { locale } = useParams<{ locale: string }>();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<LabCategory | "">("");
  const [abnormalOnly, setAbnormalOnly] = useState(false);

  function testName(result: LabResultWithTest): string {
    return (locale === "fr" ? result.test_definitions?.name_fr : result.test_definitions?.name_en) ?? t("unknownTest");
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return results.filter((result) => {
      if (q && !testName(result).toLowerCase().includes(q)) return false;
      if (category && result.category !== category) return false;
      if (abnormalOnly && !result.abnormal_flag) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, query, category, abnormalOnly, locale]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="w-full rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm text-secondary sm:max-w-xs"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as LabCategory | "")}
          className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm text-secondary"
        >
          <option value="">{t("allCategories")}</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`categories.${c}`)}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 whitespace-nowrap text-sm text-secondary">
          <input type="checkbox" checked={abnormalOnly} onChange={(e) => setAbnormalOnly(e.target.checked)} />
          {t("abnormalOnly")}
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-dashed border-surface p-8 text-center">
          <p className="text-sm text-muted">{t("noFilterResults")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((result) => (
            <LabResultCard
              key={result.id}
              result={result}
              testDefinitions={testDefinitions}
              referenceRanges={referenceRanges.filter((r) => r.test_definition_id === result.test_definition_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
