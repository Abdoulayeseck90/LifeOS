"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { FinanceTransactionType } from "@/types/core/entities";
import { LifeOSInput } from "@/components/core/form/lifeos-input";
import { PendingSyncBadge } from "@/components/core/pending-sync-badge";
import { attemptFetch } from "@/lib/offline/attempt-fetch";
import { getDB, type OfflineFinanceEntry } from "@/lib/offline/db";
import { enqueue, SYNC_UPDATED_EVENT } from "@/lib/offline/sync-queue";

// Offline Strategy spec, Section 4: a deliberately minimal Income/Expense
// entry — type/description/amount/date/category only, the fields that
// matter for a fast offline capture. This is separate from the full
// transaction-form.tsx (business/project/recurring/notes), which stays
// online-only and unchanged — Quick Entry never replaces it.
export function QuickEntryForm() {
  const t = useTranslations("finance.quickEntry");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [type, setType] = useState<FinanceTransactionType>("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingEntries, setPendingEntries] = useState<OfflineFinanceEntry[]>([]);

  const refreshPending = useCallback(() => {
    getDB()
      .then((db) => db.getAll("finance_quick_entries"))
      .then(setPendingEntries)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refreshPending();
    window.addEventListener(SYNC_UPDATED_EVENT, refreshPending);
    return () => window.removeEventListener(SYNC_UPDATED_EVENT, refreshPending);
  }, [refreshPending]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError(t("descriptionRequired"));
      return;
    }
    const amountValue = parseFloat(amount);
    if (Number.isNaN(amountValue) || amountValue <= 0) {
      setError(t("amountRequired"));
      return;
    }
    if (!category.trim()) {
      setError(t("categoryRequired"));
      return;
    }

    setSubmitting(true);

    const bodyObject = {
      type,
      description: description.trim(),
      amount: amountValue,
      date,
      category: category.trim(),
    };

    const attempt = await attemptFetch("/api/finance/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyObject),
    });

    if (attempt.networkFailure) {
      const db = await getDB();
      const localId = crypto.randomUUID();
      const localEntry: OfflineFinanceEntry = {
        id: localId,
        user_id: "",
        type,
        description: bodyObject.description,
        amount: amountValue,
        date,
        category: bodyObject.category,
        payment_method: null,
        is_recurring: false,
        business_id: null,
        project_id: null,
        bill_id: null,
        subscription_id: null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _pendingSync: true,
      };
      await db.put("finance_quick_entries", localEntry, localId);
      await enqueue({ feature: "finance_entry", operation: "create", entityId: localId, payload: bodyObject });

      setSubmitting(false);
      setDescription("");
      setAmount("");
      setCategory("");
      window.dispatchEvent(new Event(SYNC_UPDATED_EVENT));
      return;
    }

    setSubmitting(false);

    if (!attempt.response.ok) {
      setError(t("saveError"));
      return;
    }

    setDescription("");
    setAmount("");
    setCategory("");
    router.refresh();
  }

  return (
    <div className="rounded-card border border-surface bg-white p-4">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t("title")}</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error && <p className="text-sm text-status-urgent">{error}</p>}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType("expense")}
            className={`min-h-11 rounded border px-3 text-sm font-medium ${type === "expense" ? "border-primary bg-primary/10 text-primary" : "border-surface text-secondary"}`}
          >
            {t("typeExpense")}
          </button>
          <button
            type="button"
            onClick={() => setType("income")}
            className={`min-h-11 rounded border px-3 text-sm font-medium ${type === "income" ? "border-primary bg-primary/10 text-primary" : "border-surface text-secondary"}`}
          >
            {t("typeIncome")}
          </button>
        </div>

        <LifeOSInput
          type="text"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("descriptionPlaceholder")}
          aria-label={t("descriptionPlaceholder")}
        />

        <div className="grid grid-cols-2 gap-2">
          <LifeOSInput
            type="number"
            min={0}
            step="any"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t("amountPlaceholder")}
            aria-label={t("amountPlaceholder")}
          />
          <LifeOSInput type="date" required value={date} onChange={(e) => setDate(e.target.value)} aria-label={t("date")} />
        </div>

        <LifeOSInput
          type="text"
          required
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder={t("categoryPlaceholder")}
          aria-label={t("categoryPlaceholder")}
        />

        <button
          type="submit"
          disabled={submitting}
          className="min-h-11 rounded bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {submitting ? tCommon("loading") : t("addButton")}
        </button>
      </form>

      {pendingEntries.length > 0 && (
        <div className="mt-4 flex flex-col gap-2 border-t border-surface pt-3">
          {pendingEntries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between text-sm">
              <span className="text-secondary">{entry.description}</span>
              <span className="flex items-center gap-2">
                <span className="text-muted">{entry.amount}</span>
                <PendingSyncBadge />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
