"use client";

import { useTranslations } from "next-intl";
import type { DuaCategory } from "@/types/core/entities";

// Section 18's literal filter list — "Keep filters simple," not the
// full Section 3 taxonomy or Section 8's personal-category list.
const FILTER_CATEGORIES: (DuaCategory | "all")[] = [
  "all",
  "morning",
  "evening",
  "before_sleep",
  "protection",
  "forgiveness",
  "guidance",
  "rizq",
  "family",
  "travel",
  "health",
  "personal",
];

export function DuaCategoryChips({ active, onChange }: { active: string; onChange: (category: string) => void }) {
  const t = useTranslations("faith.dua.categories");
  const tExplore = useTranslations("faith.dua.explore");

  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={tExplore("categoryFilter")}>
      {FILTER_CATEGORIES.map((category) => {
        const isActive = active === category;
        return (
          <button
            key={category}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(category)}
            className={`shrink-0 rounded border px-4 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              isActive ? "border-primary bg-primary/10 text-primary" : "border-surface bg-white text-secondary hover:bg-surface"
            }`}
          >
            {category === "all" ? tExplore("allCategories") : t(category)}
          </button>
        );
      })}
    </div>
  );
}
