"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Business, FinanceTransaction, Project } from "@/types/core/entities";
import { TransactionCard } from "@/components/finance/transaction-card";
import { DateRangeFilter } from "@/components/core/date-range-filter";

// Finance spec, Section 22: search + category filter + date range,
// "do not overload the interface with filters." Client-side over the
// already-fetched list, same pattern as vital-history.tsx/notes-list.tsx.
export function TransactionHistory({
  transactions,
  projects,
  businesses,
}: {
  transactions: FinanceTransaction[];
  projects: Project[];
  businesses: Business[];
}) {
  const t = useTranslations("finance.transactions");
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const categories = useMemo(() => Array.from(new Set(transactions.map((txn) => txn.category))).sort(), [transactions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions
      .filter((txn) => {
        if (q && !txn.description.toLowerCase().includes(q) && !txn.category.toLowerCase().includes(q)) return false;
        if (category !== "all" && txn.category !== category) return false;
        if (from && txn.date < from) return false;
        if (to && txn.date > to) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, query, category, from, to]);

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
        {categories.length > 1 && (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label={t("categoryFilter")}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 text-sm text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">{t("allCategories")}</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </div>

      <DateRangeFilter quickRanges={["7d", "30d", "3m", "6m", "thisYear", "custom"]} />

      {filtered.length === 0 ? (
        <div className="rounded-card border border-dashed border-surface p-8 text-center">
          <p className="text-sm text-muted">{transactions.length === 0 ? t("emptyMessage") : t("noResults")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((txn) => (
            <TransactionCard key={txn.id} transaction={txn} projects={projects} businesses={businesses} />
          ))}
        </div>
      )}
    </div>
  );
}
