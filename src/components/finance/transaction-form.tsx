"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Business, FinanceTransaction, FinanceTransactionType, Project } from "@/types/core/entities";
import type { RecordFormRenderProps } from "@/components/core/record-form-modal";
import { FormField } from "@/components/core/form/form-field";
import { LifeOSInput } from "@/components/core/form/lifeos-input";
import { LifeOSSelect } from "@/components/core/form/lifeos-select";
import { LifeOSTextarea } from "@/components/core/form/lifeos-textarea";
import { LifeOSCheckbox } from "@/components/core/form/lifeos-checkbox";
import { LifeOSFormActions } from "@/components/core/form/lifeos-form-actions";

const INCOME_CATEGORIES = ["salary", "business", "freelance", "other"] as const;
const EXPENSE_CATEGORIES = [
  "housing",
  "food",
  "transportation",
  "utilities",
  "healthcare",
  "entertainment",
  "shopping",
  "travel",
  "business",
  "other",
] as const;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// Finance spec, Section 19-21: Income and Expenses share one form/one
// table — a Type toggle swaps the suggested category list and shows/
// hides Payment Method, rather than two separate forms. Category is a
// free-text input with suggestions (a <datalist>) so a custom category
// is always possible (Section 21: "allow custom categories").
export function TransactionForm({
  transaction,
  defaultType,
  defaultBusinessId,
  defaultProjectId,
  projects,
  businesses,
  closeAfterSave,
  requestClose,
  registerDirty,
}: {
  transaction?: FinanceTransaction;
  defaultType?: FinanceTransactionType;
  defaultBusinessId?: string;
  defaultProjectId?: string;
  projects: Project[];
  businesses: Business[];
} & RecordFormRenderProps) {
  const t = useTranslations("finance.transactionForm");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [type, setType] = useState<FinanceTransactionType>(transaction?.type ?? defaultType ?? "expense");
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [amount, setAmount] = useState(transaction?.amount != null ? String(transaction.amount) : "");
  const [date, setDate] = useState(transaction?.date ?? todayIso());
  const [category, setCategory] = useState(transaction?.category ?? "");
  const [paymentMethod, setPaymentMethod] = useState(transaction?.payment_method ?? "");
  const [isRecurring, setIsRecurring] = useState(transaction?.is_recurring ?? false);
  const [businessId, setBusinessId] = useState(transaction?.business_id ?? defaultBusinessId ?? "");
  const [projectId, setProjectId] = useState(transaction?.project_id ?? defaultProjectId ?? "");
  const [notes, setNotes] = useState(transaction?.notes ?? "");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fieldValues = { type, description, amount, date, category, paymentMethod, isRecurring, businessId, projectId, notes };
  const initialSnapshot = useRef(JSON.stringify(fieldValues));
  useEffect(() => {
    registerDirty(JSON.stringify(fieldValues) !== initialSnapshot.current);
  });

  const suggestedCategories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const amountValue = parseFloat(amount);
    if (!description.trim()) {
      setError(t("descriptionRequired"));
      return;
    }
    if (!amountValue || amountValue <= 0) {
      setError(t("amountRequired"));
      return;
    }
    if (!category.trim()) {
      setError(t("categoryRequired"));
      return;
    }

    setSubmitting(true);

    const body = JSON.stringify({
      type,
      description: description.trim(),
      amount: amountValue,
      date,
      category: category.trim(),
      payment_method: type === "expense" ? paymentMethod.trim() || undefined : undefined,
      is_recurring: isRecurring,
      business_id: businessId || undefined,
      project_id: projectId || undefined,
      notes: notes.trim() || undefined,
    });

    const response = transaction
      ? await fetch(`/api/finance/transactions/${transaction.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body })
      : await fetch("/api/finance/transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body });

    setSubmitting(false);

    if (!response.ok) {
      setError(t("saveError"));
      return;
    }

    registerDirty(false);
    closeAfterSave();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <p className="text-sm text-status-urgent">{error}</p>}

      <div className="flex rounded border border-surface p-0.5">
        <button
          type="button"
          onClick={() => setType("income")}
          aria-pressed={type === "income"}
          className={`flex-1 rounded px-3 py-2 text-sm font-medium ${type === "income" ? "bg-primary text-primary-foreground" : "text-secondary"}`}
        >
          {t("typeIncome")}
        </button>
        <button
          type="button"
          onClick={() => setType("expense")}
          aria-pressed={type === "expense"}
          className={`flex-1 rounded px-3 py-2 text-sm font-medium ${type === "expense" ? "bg-primary text-primary-foreground" : "text-secondary"}`}
        >
          {t("typeExpense")}
        </button>
      </div>

      <FormField label={type === "income" ? t("source") : t("description")} htmlFor="txn-description" required>
        <LifeOSInput id="txn-description" type="text" required value={description} onChange={(e) => setDescription(e.target.value)} />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("amount")} htmlFor="txn-amount" required>
          <LifeOSInput id="txn-amount" type="number" min={0.01} step="any" required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </FormField>

        <FormField label={t("date")} htmlFor="txn-date" required>
          <LifeOSInput id="txn-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </FormField>

        <FormField label={t("category")} htmlFor="txn-category" required>
          <LifeOSInput id="txn-category" type="text" required list="txn-category-suggestions" value={category} onChange={(e) => setCategory(e.target.value)} />
          <datalist id="txn-category-suggestions">
            {suggestedCategories.map((c) => (
              <option key={c} value={t(`categories.${c}`)} />
            ))}
          </datalist>
        </FormField>

        {type === "expense" && (
          <FormField label={t("paymentMethod")} htmlFor="txn-payment-method" optional>
            <LifeOSInput id="txn-payment-method" type="text" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} />
          </FormField>
        )}

        <FormField label={t("business")} htmlFor="txn-business" optional>
          <LifeOSSelect id="txn-business" value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
            <option value="">{tCommon("none")}</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </LifeOSSelect>
        </FormField>

        <FormField label={t("project")} htmlFor="txn-project" optional>
          <LifeOSSelect id="txn-project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">{tCommon("none")}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </LifeOSSelect>
        </FormField>
      </div>

      <LifeOSCheckbox label={t("recurring")} checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />

      <FormField label={t("notes")} htmlFor="txn-notes" optional>
        <LifeOSTextarea id="txn-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </FormField>

      <LifeOSFormActions onCancel={requestClose} submitting={submitting} submitLabel={tCommon("save")} />
    </form>
  );
}
