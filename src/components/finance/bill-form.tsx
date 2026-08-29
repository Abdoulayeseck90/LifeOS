"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Bill, BillFrequency, Business } from "@/types/core/entities";
import type { RecordFormRenderProps } from "@/components/core/record-form-modal";
import { FormField } from "@/components/core/form/form-field";
import { LifeOSInput } from "@/components/core/form/lifeos-input";
import { LifeOSSelect } from "@/components/core/form/lifeos-select";
import { LifeOSTextarea } from "@/components/core/form/lifeos-textarea";
import { LifeOSCheckbox } from "@/components/core/form/lifeos-checkbox";
import { LifeOSFormActions } from "@/components/core/form/lifeos-form-actions";

const FREQUENCIES: BillFrequency[] = ["weekly", "monthly", "quarterly", "yearly", "custom"];

// Bills spec, Section 22: a Bill is money EXPECTED to be paid — this
// form only ever captures that expectation (name/amount/due date/
// recurrence). status/paid_at/linked_transaction_id are set exclusively
// by the "Mark as Paid" action (bill-card.tsx), never editable here.
export function BillForm({
  bill,
  businesses,
  closeAfterSave,
  requestClose,
  registerDirty,
}: { bill?: Bill; businesses: Business[] } & RecordFormRenderProps) {
  const t = useTranslations("finance.billForm");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [name, setName] = useState(bill?.name ?? "");
  const [amount, setAmount] = useState(bill?.amount != null ? String(bill.amount) : "");
  const [dueDate, setDueDate] = useState(bill?.due_date ?? "");
  const [category, setCategory] = useState(bill?.category ?? "");
  const [isRecurring, setIsRecurring] = useState(bill?.is_recurring ?? false);
  const [frequency, setFrequency] = useState<BillFrequency | "">(bill?.frequency ?? "monthly");
  const [autoPay, setAutoPay] = useState(bill?.auto_pay ?? false);
  const [paymentMethod, setPaymentMethod] = useState(bill?.payment_method ?? "");
  const [businessId, setBusinessId] = useState(bill?.business_id ?? "");
  const [remindersEnabled, setRemindersEnabled] = useState(bill?.reminders_enabled ?? true);
  const [notes, setNotes] = useState(bill?.notes ?? "");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fieldValues = { name, amount, dueDate, category, isRecurring, frequency, autoPay, paymentMethod, businessId, remindersEnabled, notes };
  const initialSnapshot = useRef(JSON.stringify(fieldValues));
  useEffect(() => {
    registerDirty(JSON.stringify(fieldValues) !== initialSnapshot.current);
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const amountValue = parseFloat(amount);

    if (!name.trim()) {
      setError(t("nameRequired"));
      return;
    }
    if (Number.isNaN(amountValue) || amountValue <= 0) {
      setError(t("amountRequired"));
      return;
    }
    if (!dueDate) {
      setError(t("dueDateRequired"));
      return;
    }

    setSubmitting(true);

    const body = JSON.stringify({
      name: name.trim(),
      amount: amountValue,
      due_date: dueDate,
      category: category.trim() || undefined,
      is_recurring: isRecurring,
      frequency: isRecurring ? frequency || undefined : undefined,
      auto_pay: autoPay,
      payment_method: paymentMethod.trim() || undefined,
      business_id: businessId || undefined,
      reminders_enabled: remindersEnabled,
      notes: notes.trim() || undefined,
    });

    const response = bill
      ? await fetch(`/api/finance/bills/${bill.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body })
      : await fetch("/api/finance/bills", { method: "POST", headers: { "Content-Type": "application/json" }, body });

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

      <FormField label={t("name")} htmlFor="bill-name" required>
        <LifeOSInput id="bill-name" type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("amount")} htmlFor="bill-amount" required>
          <LifeOSInput id="bill-amount" type="number" min={0} step="any" required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </FormField>

        <FormField label={t("dueDate")} htmlFor="bill-due-date" required>
          <LifeOSInput id="bill-due-date" type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </FormField>

        <FormField label={t("category")} htmlFor="bill-category" optional>
          <LifeOSInput id="bill-category" type="text" value={category} onChange={(e) => setCategory(e.target.value)} />
        </FormField>

        <FormField label={t("paymentMethod")} htmlFor="bill-payment-method" optional>
          <LifeOSInput id="bill-payment-method" type="text" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} />
        </FormField>

        <FormField label={t("business")} htmlFor="bill-business" optional>
          <LifeOSSelect id="bill-business" value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
            <option value="">{tCommon("none")}</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </LifeOSSelect>
        </FormField>
      </div>

      <LifeOSCheckbox label={t("isRecurring")} checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />

      {isRecurring && (
        <FormField label={t("frequency")} htmlFor="bill-frequency">
          <LifeOSSelect id="bill-frequency" value={frequency} onChange={(e) => setFrequency(e.target.value as BillFrequency)}>
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {t(`frequencyOptions.${f}`)}
              </option>
            ))}
          </LifeOSSelect>
        </FormField>
      )}

      <LifeOSCheckbox label={t("autoPay")} checked={autoPay} onChange={(e) => setAutoPay(e.target.checked)} />
      <LifeOSCheckbox label={t("remindersEnabled")} checked={remindersEnabled} onChange={(e) => setRemindersEnabled(e.target.checked)} />

      <FormField label={t("notes")} htmlFor="bill-notes" optional>
        <LifeOSTextarea id="bill-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </FormField>

      <LifeOSFormActions onCancel={requestClose} submitting={submitting} submitLabel={tCommon("save")} />
    </form>
  );
}
