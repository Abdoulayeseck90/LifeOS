import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { listPersonalDocuments } from "@/services/core/personal-documents";
import { listFinanceTransactions } from "@/services/core/finance";
import { getDaysUntilExpiration } from "@/lib/documents/expiration-status";
import { DocumentAddButton } from "@/components/documents/document-add-button";
import { ReceiptAddButton } from "@/components/documents/receipt-add-button";
import { DocumentCard } from "@/components/documents/document-card";
import { DocumentList } from "@/components/documents/document-list";
import { SectionHeader } from "@/components/core/section-header";
import { Search } from "lucide-react";
import type { FinanceTransaction, PersonalDocument } from "@/types/core/entities";

// Section 66: an overview dashboard by default — Recent/Pinned/
// Categories/Receipts/Attention/Expiring, each capped so the page never
// dumps every document at once. `?q=`/`?category=`/`?view=` switch the
// same route into a full filtered DocumentList (Section 75's "Documents
// -> Pinned" becomes a real link: /documents?view=pinned).
export const dynamic = "force-dynamic";

const OVERVIEW_LIMIT = 5;

function isExpired(doc: PersonalDocument): boolean {
  return doc.expiration_date != null && getDaysUntilExpiration(doc.expiration_date) < 0;
}

function isExpiringSoon(doc: PersonalDocument): boolean {
  if (!doc.expiration_date) return false;
  const days = getDaysUntilExpiration(doc.expiration_date);
  return days >= 0 && days <= 30;
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; view?: string }>;
}) {
  const t = await getTranslations("personalDocuments");
  const { q, category, view } = await searchParams;
  const [documents, transactions] = await Promise.all([listPersonalDocuments(), listFinanceTransactions()]);

  const expenses = transactions.filter((txn) => txn.type === "expense");
  const expensesById = new Map(expenses.map((expense) => [expense.id, expense]));
  const linkedExpenseIds = new Set(documents.filter((d) => d.related_expense_id).map((d) => d.related_expense_id as string));
  const unlinkedExpenses = expenses.filter((expense) => !linkedExpenseIds.has(expense.id));

  if (documents.length === 0) {
    return (
      <div>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-secondary">{t("title")}</h1>
            <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
          </div>
        </div>
        <div className="rounded-card border border-dashed border-surface p-8 text-center">
          <p className="text-sm font-medium text-secondary">{t("emptyTitle")}</p>
          <p className="mt-1 text-sm text-muted">{t("emptyMessage")}</p>
          <div className="mt-4 flex justify-center">
            <DocumentAddButton unlinkedExpenses={unlinkedExpenses} />
          </div>
        </div>
      </div>
    );
  }

  const isFilteredView = Boolean(q || category || view);

  let scoped = documents;
  if (view === "pinned") scoped = documents.filter((d) => d.pinned);
  else if (view === "receipts") scoped = documents.filter((d) => d.document_type === "receipt");
  else if (view === "attention") scoped = documents.filter(isExpired);
  else if (view === "expiring") scoped = documents.filter(isExpiringSoon);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-secondary">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <DocumentAddButton unlinkedExpenses={unlinkedExpenses} />
          <ReceiptAddButton unlinkedExpenses={unlinkedExpenses} />
        </div>
      </div>

      {!isFilteredView && (
        <form method="get" action="/documents" className="relative mb-8 max-w-md">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            name="q"
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="w-full rounded border border-slate-300 bg-white py-3 pl-10 pr-3.5 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm text-secondary"
          />
        </form>
      )}

      {isFilteredView ? (
        <>
          <Link href="/documents" className="mb-4 inline-block text-sm text-primary hover:underline">
            {t("backToOverview")}
          </Link>
          <DocumentList documents={scoped} unlinkedExpenses={unlinkedExpenses} expensesById={expensesById} initialQuery={q} initialCategory={category ?? "all"} />
        </>
      ) : (
        <DocumentsOverview documents={documents} unlinkedExpenses={unlinkedExpenses} expensesById={expensesById} />
      )}
    </div>
  );
}

async function DocumentsOverview({
  documents,
  unlinkedExpenses,
  expensesById,
}: {
  documents: PersonalDocument[];
  unlinkedExpenses: FinanceTransaction[];
  expensesById: Map<string, FinanceTransaction>;
}) {
  const t = await getTranslations("personalDocuments");

  // listPersonalDocuments already orders by created_at desc.
  const recent = documents.slice(0, OVERVIEW_LIMIT);
  const pinned = documents.filter((d) => d.pinned).slice(0, OVERVIEW_LIMIT);
  const receipts = documents.filter((d) => d.document_type === "receipt").slice(0, OVERVIEW_LIMIT);
  const attention = documents.filter(isExpired).slice(0, OVERVIEW_LIMIT);
  const expiring = documents.filter(isExpiringSoon).slice(0, OVERVIEW_LIMIT);

  const categoryCounts = new Map<string, number>();
  for (const doc of documents) {
    if (!doc.category) continue;
    categoryCounts.set(doc.category, (categoryCounts.get(doc.category) ?? 0) + 1);
  }
  const categories = Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1]);

  function renderSection(key: string, title: string, items: PersonalDocument[], viewParam: string) {
    if (items.length === 0) return null;
    return (
      <div className="mb-8">
        <SectionHeader title={title} action={{ label: t("viewAll"), href: `/documents?view=${viewParam}` }} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((doc) => (
            <DocumentCard key={`${key}-${doc.id}`} document={doc} unlinkedExpenses={unlinkedExpenses} expensesById={expensesById} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {renderSection("recent", t("recentDocuments"), recent, "all")}
      {renderSection("pinned", t("pinnedDocuments"), pinned, "pinned")}

      {categories.length > 0 && (
        <div className="mb-8">
          <SectionHeader title={t("categories")} />
          <div className="flex flex-wrap gap-2">
            {categories.map(([name, count]) => (
              <Link
                key={name}
                href={`/documents?category=${encodeURIComponent(name)}`}
                className="rounded border border-surface bg-white px-4 py-2 text-sm text-secondary hover:bg-surface"
              >
                {name} <span className="text-muted">({count})</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {renderSection("receipts", t("receipts"), receipts, "receipts")}
      {renderSection("attention", t("requiringAttention"), attention, "attention")}
      {renderSection("expiring", t("nearingExpiration"), expiring, "expiring")}
    </>
  );
}
