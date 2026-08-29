"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { FinanceTransaction, PersonalDocument } from "@/types/core/entities";
import { DocumentCard } from "@/components/documents/document-card";
import { DocumentCategoryChips } from "@/components/documents/document-category-chips";

// Section 74: search by name/description/tags/category/document_type/
// merchant + simple category filters — client-side over the
// already-fetched list, same convention as TransactionHistory.
export function DocumentList({
  documents,
  unlinkedExpenses,
  expensesById,
  initialQuery,
  initialCategory,
}: {
  documents: PersonalDocument[];
  unlinkedExpenses: FinanceTransaction[];
  expensesById: Map<string, FinanceTransaction>;
  initialQuery?: string;
  initialCategory?: string;
}) {
  const t = useTranslations("personalDocuments");
  const [query, setQuery] = useState(initialQuery ?? "");
  const [category, setCategory] = useState(initialCategory ?? "all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents.filter((doc) => {
      if (category !== "all" && doc.category !== category) return false;
      if (!q) return true;
      return (
        doc.name.toLowerCase().includes(q) ||
        (doc.description ?? "").toLowerCase().includes(q) ||
        doc.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        (doc.category ?? "").toLowerCase().includes(q) ||
        doc.document_type.toLowerCase().includes(q) ||
        (doc.merchant ?? "").toLowerCase().includes(q)
      );
    });
  }, [documents, query, category]);

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

      <DocumentCategoryChips active={category} onChange={setCategory} />

      {filtered.length === 0 ? (
        <div className="rounded-card border border-dashed border-surface p-8 text-center">
          <p className="text-sm text-muted">{documents.length === 0 ? t("empty") : t("noResults")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc) => (
            <DocumentCard key={doc.id} document={doc} unlinkedExpenses={unlinkedExpenses} expensesById={expensesById} />
          ))}
        </div>
      )}
    </div>
  );
}
