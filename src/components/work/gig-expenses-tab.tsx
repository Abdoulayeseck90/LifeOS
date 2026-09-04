"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Trash2 } from "lucide-react";
import type { GigExpense, GigVehicle, GigExpenseCategory } from "@/types/work/entities";
import type { PersonalDocument } from "@/types/core/entities";
import { FormField } from "@/components/core/form/form-field";
import { LifeOSInput } from "@/components/core/form/lifeos-input";
import { LifeOSSelect } from "@/components/core/form/lifeos-select";
import { formatCurrency } from "@/lib/work/gig-format";
import { GigReceiptAttachment } from "@/components/work/gig-receipt-attachment";

const EXPENSE_CATEGORIES: GigExpenseCategory[] = ["fuel", "maintenance", "tires", "repairs", "car_wash", "parking", "tolls", "phone", "insurance", "other"];

export function GigExpensesTab({
  expenses,
  vehicles,
  documentsByExpenseId,
}: {
  expenses: GigExpense[];
  vehicles: GigVehicle[];
  documentsByExpenseId: Record<string, PersonalDocument[]>;
}) {
  const t = useTranslations("gigDriving.expenses");
  const locale = useLocale();
  const router = useRouter();

  const [category, setCategory] = useState<GigExpenseCategory>("fuel");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [vehicleId, setVehicleId] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError(t("amountRequired"));
      return;
    }
    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/work/gig-driving/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        amount: Number(amount),
        date,
        vehicle_id: vehicleId || undefined,
        description: description.trim() || undefined,
      }),
    });

    setSubmitting(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : t("saveError"));
      return;
    }

    setAmount("");
    setDescription("");
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t("deleteConfirm"))) return;
    setPendingId(id);
    const response = await fetch(`/api/work/gig-driving/expenses/${id}`, { method: "DELETE" });
    setPendingId(null);
    if (response.ok) router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-card border border-surface bg-white p-4">
        <h2 className="text-sm font-semibold text-secondary">{t("addTitle")}</h2>
        {error && <p className="text-sm text-status-urgent">{error}</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label={t("category")} htmlFor="expense-category">
            <LifeOSSelect id="expense-category" value={category} onChange={(e) => setCategory(e.target.value as GigExpenseCategory)}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`categoryOptions.${c}`)}
                </option>
              ))}
            </LifeOSSelect>
          </FormField>
          <FormField label={t("amount")} htmlFor="expense-amount" required>
            <LifeOSInput id="expense-amount" type="number" min={0} step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </FormField>
          <FormField label={t("date")} htmlFor="expense-date">
            <LifeOSInput id="expense-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </FormField>
          {vehicles.length > 0 && (
            <FormField label={t("vehicle")} htmlFor="expense-vehicle" optional>
              <LifeOSSelect id="expense-vehicle" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                <option value="">{t("noVehicle")}</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nickname ?? [v.year, v.make, v.model].filter(Boolean).join(" ") ?? v.id}
                  </option>
                ))}
              </LifeOSSelect>
            </FormField>
          )}
          <FormField label={t("description")} htmlFor="expense-description" optional className="sm:col-span-2">
            <LifeOSInput id="expense-description" type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
          </FormField>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="min-h-11 w-fit rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting ? t("saving") : t("addButton")}
        </button>
      </form>

      {expenses.length === 0 ? (
        <p className="text-sm text-muted">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {expenses.map((expense) => (
            <li key={expense.id} className="flex items-start justify-between gap-4 rounded-card border border-surface bg-white px-4 py-3">
              <div>
                <p className="text-sm font-medium text-secondary">
                  {t(`categoryOptions.${expense.category}`)} — {formatCurrency(expense.amount)}
                </p>
                <p className="text-xs text-muted">
                  {new Date(`${expense.date}T00:00:00`).toLocaleDateString(locale)}
                  {expense.description ? ` · ${expense.description}` : ""}
                </p>
                <div className="mt-2">
                  <GigReceiptAttachment relatedGigExpenseId={expense.id} documents={documentsByExpenseId[expense.id] ?? []} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(expense.id)}
                disabled={pendingId === expense.id}
                className="min-h-11 min-w-11 shrink-0 text-muted hover:text-status-urgent disabled:opacity-50"
                aria-label={t("delete")}
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
