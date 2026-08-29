"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Dua } from "@/types/core/entities";
import { DuaCard } from "@/components/faith/dua-card";
import { DuaCategoryChips } from "@/components/faith/dua-category-chips";

// Section 17/18: search by title/category/keyword/context + simple
// category filter chips — client-side over the already-fetched list,
// same convention as every other search page this session.
export function DuaExploreList({ duas }: { duas: Dua[] }) {
  const t = useTranslations("faith.dua.explore");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return duas.filter((dua) => {
      if (category !== "all" && dua.category !== category) return false;
      if (!q) return true;
      return (
        dua.title.toLowerCase().includes(q) ||
        dua.category.toLowerCase().includes(q) ||
        (dua.meaning ?? "").toLowerCase().includes(q) ||
        (dua.recommended_time ?? "").toLowerCase().includes(q)
      );
    });
  }, [duas, query, category]);

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        className="mb-4 w-full rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm text-secondary sm:max-w-xs"
      />

      <DuaCategoryChips active={category} onChange={setCategory} />

      {filtered.length === 0 ? (
        <div className="rounded-card border border-dashed border-surface p-8 text-center">
          <p className="text-sm text-muted">{duas.length === 0 ? t("empty") : t("noResults")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((dua) => (
            <DuaCard key={dua.id} dua={dua} />
          ))}
        </div>
      )}
    </div>
  );
}
