"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Condition, DiagnosticTest, DiagnosticTestCategory } from "@/types/health/entities";
import type { Document } from "@/types/core/entities";
import { DIAGNOSTIC_CATEGORIES } from "@/components/health/diagnostic-test-category-config";
import { DiagnosticTestCard } from "@/components/health/diagnostic-test-card";

// Chronological cross-category view (Spec Section 13) with a category
// filter (chips only for categories the user actually has records in —
// Section 25: "do not create unnecessary filters") and a simple search
// (Section 14: client-side, personal-scale data, same pattern as
// lab-results-filters.tsx / workout-history.tsx).
export function DiagnosticTestHistory({
  tests,
  conditions,
  documents,
}: {
  tests: DiagnosticTest[];
  conditions: Condition[];
  documents: Document[];
}) {
  const t = useTranslations("diagnosticTests");
  const tHistory = useTranslations("diagnosticTests.history");
  const [category, setCategory] = useState<DiagnosticTestCategory | "all">("all");
  const [query, setQuery] = useState("");

  const availableCategories = useMemo(() => {
    const present = new Set(tests.map((test) => test.category ?? "other"));
    return DIAGNOSTIC_CATEGORIES.filter((cat) => present.has(cat));
  }, [tests]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tests.filter((test) => {
      if (category !== "all" && (test.category ?? "other") !== category) return false;
      if (q) {
        const testLabel = t.has(`form.testTypeOptions.${test.test_type}`) ? t(`form.testTypeOptions.${test.test_type}`) : test.test_type;
        const haystack = `${testLabel} ${test.facility ?? ""} ${test.provider ?? ""} ${test.study_date}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [tests, category, query, t]);

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{tHistory("title")}</h2>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tHistory("searchPlaceholder")}
          aria-label={tHistory("searchPlaceholder")}
          className="w-full rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm text-secondary sm:max-w-xs"
        />
      </div>

      {availableCategories.length > 1 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-3 text-xs font-medium ${
              category === "all" ? "border-primary bg-primary text-primary-foreground" : "border-surface text-secondary hover:bg-surface"
            }`}
          >
            {tHistory("filterAll")}
          </button>
          {availableCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-3 text-xs font-medium ${
                category === cat ? "border-primary bg-primary text-primary-foreground" : "border-surface text-secondary hover:bg-surface"
              }`}
            >
              {t(`categories.${cat}.label`)}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-card border border-dashed border-surface p-8 text-center">
          <p className="text-sm text-muted">{tests.length === 0 ? t("empty") : tHistory("noResults")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((test) => (
            <DiagnosticTestCard key={test.id} test={test} conditions={conditions} documents={documents} />
          ))}
        </div>
      )}
    </section>
  );
}
