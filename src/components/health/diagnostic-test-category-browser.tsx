"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Condition, DiagnosticTest, DiagnosticTestCategory } from "@/types/health/entities";
import type { Document } from "@/types/core/entities";
import { DIAGNOSTIC_CATEGORIES, DIAGNOSTIC_CATEGORY_ICON } from "@/components/health/diagnostic-test-category-config";
import { DiagnosticTestCard } from "@/components/health/diagnostic-test-card";
import { DiagnosticTestAddButton } from "@/components/health/diagnostic-test-add-button";

// The category tab navigation + default "Imaging" view (Spec Sections
// 2-3) — one page, five categories switched client-side over the
// already-fetched full list, never five separate routes. Horizontally
// scrollable on mobile per Section 22 rather than a dropdown, since 5
// short labels fit a scroll strip better than a select on a touch device.
export function DiagnosticTestCategoryBrowser({
  tests,
  conditions,
  documents,
}: {
  tests: DiagnosticTest[];
  conditions: Condition[];
  documents: Document[];
}) {
  const t = useTranslations("diagnosticTests");
  const [category, setCategory] = useState<DiagnosticTestCategory>("imaging");

  const filtered = tests.filter((test) => (test.category ?? "other") === category);

  return (
    <section className="mb-10">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t("recentTitle")}</h2>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={t("categoryNavLabel")}>
        {DIAGNOSTIC_CATEGORIES.map((cat) => {
          const Icon = DIAGNOSTIC_CATEGORY_ICON[cat];
          const active = category === cat;
          return (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setCategory(cat)}
              className={`flex min-h-11 shrink-0 items-center gap-2 rounded border px-4 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                active ? "border-primary bg-primary/10 text-primary" : "border-surface bg-white text-secondary hover:bg-surface"
              }`}
            >
              <Icon size={16} />
              {t(`categories.${cat}.label`)}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-dashed border-surface p-8 text-center">
          <p className="text-sm text-muted">{t(`categories.${category}.empty`)}</p>
          <div className="mt-3 flex justify-center">
            <DiagnosticTestAddButton conditions={conditions} documents={documents} />
          </div>
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
