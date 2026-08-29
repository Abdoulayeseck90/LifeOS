"use client";

import { useTranslations } from "next-intl";

// Section 74's example filter row — All/Receipts/Identity/Financial/
// Education/Legal/Insurance/Other — built on the same tablist pattern as
// diagnostic-test-category-browser.tsx. Category is free text (Section
// 68: "allow custom categories"), so this filters by substring/exact
// match against the document's category field, not a DB enum.
const CATEGORY_FILTERS = ["all", "Receipts", "Identity", "Financial", "Education", "Legal", "Insurance", "Other"];

export function DocumentCategoryChips({ active, onChange }: { active: string; onChange: (category: string) => void }) {
  const t = useTranslations("personalDocuments");

  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={t("categoryFilter")}>
      {CATEGORY_FILTERS.map((filter) => {
        const isActive = active === filter;
        return (
          <button
            key={filter}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(filter)}
            className={`shrink-0 rounded border px-4 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              isActive ? "border-primary bg-primary/10 text-primary" : "border-surface bg-white text-secondary hover:bg-surface"
            }`}
          >
            {filter === "all" ? t("allCategories") : filter}
          </button>
        );
      })}
    </div>
  );
}
