"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Bill, BillFrequency, Business, CreditCard, Loan } from "@/types/core/entities";
import type { RecordFormRenderProps } from "@/components/core/record-form-modal";
import { FormField } from "@/components/core/form/form-field";
import { LifeOSInput } from "@/components/core/form/lifeos-input";
import { LifeOSSelect } from "@/components/core/form/lifeos-select";
import { LifeOSTextarea } from "@/components/core/form/lifeos-textarea";
import { LifeOSCheckbox } from "@/components/core/form/lifeos-checkbox";
import { LifeOSFormActions } from "@/components/core/form/lifeos-form-actions";

const FREQUENCIES: BillFrequency[] = ["weekly", "monthly", "quarterly", "yearly", "custom"];

type PaymentCategory = "regular" | "credit_card" | "loan";

function initialPaymentCategory(bill?: Bill): PaymentCategory {
  if (bill?.linked_credit_card_id) return "credit_card";
  if (bill?.linked_loan_id) return "loan";
  return "regular";
}

// Bills spec, Section 22: a Bill is money EXPECTED to be paid — this
// form only ever captures that expectation (name/amount/due date/
// recurrence/optional debt link). status/paid_at/linked_transaction_id
// are set exclusively by the "Mark as Paid" action (bill-card.tsx),
// never editable here. Linking a bill to a Credit Card or Loan is what
// makes "Mark as Paid" also apply the payment to that debt's balance
// (services/core/bills.ts payBill) — a "Regular Bill" has no debt
// relationship at all, exactly like before this field existed.
export function BillForm({
  bill,
  businesses,
  creditCards,
  loans,
  closeAfterSave,
  requestClose,
  registerDirty,
}: { bill?: Bill; businesses: Business[]; creditCards: CreditCard[]; loans: Loan[] } & RecordFormRenderProps) {
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
  const [paymentCategory, setPaymentCategory] = useState<PaymentCategory>(initialPaymentCategory(bill));
  const [linkedCreditCardId, setLinkedCreditCardId] = useState(bill?.linked_credit_card_id ?? "");
  const [linkedLoanId, setLinkedLoanId] = useState(bill?.linked_loan_id ?? "");
  const [remindersEnabled, setRemindersEnabled] = useState(bill?.reminders_enabled ?? true);
  const [notes, setNotes] = useState(bill?.notes ?? "");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fieldValues = {
    name,
    amount,
    dueDate,
    category,
    isRecurring,
    frequency,
    autoPay,
    paymentMethod,
    businessId,
    paymentCategory,
    linkedCreditCardId,
    linkedLoanId,
    remindersEnabled,
    notes,
  };
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
    if (paymentCategory === "credit_card" && !linkedCreditCardId) {
      setError(t("linkedCreditCardRequired"));
      return;
    }
    if (paymentCategory === "loan" && !linkedLoanId) {
      setError(t("linkedLoanRequired"));
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
      // Editing an existing bill needs an explicit null to actually
      // clear a link (switching away from "Credit Card Payment"/"Loan
      // Payment" back to "Regular Bill") — undefined on a PATCH just
      // means "leave unchanged." Creating a new bill never has an
      // existing link to clear, so this always resolves to undefined
      // (simply omitted) there.
      linked_credit_card_id:
        paymentCategory === "credit_card" ? linkedCreditCardId || undefined : bill?.linked_credit_card_id ? null : undefined,
      linked_loan_id: paymentCategory === "loan" ? linkedLoanId || undefined : bill?.linked_loan_id ? null : undefined,
      reminders_enabled: remindersEnabled,
      notes: notes.trim() || undefined,
    });

    const response = bill
      ? await fetch(`/api/finance/bills/${bill.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body })
      : await fetch("/api/finance/bills", { method: "POST", headers: { "Content-Type": "application/json" }, body });

    setSubmitting(false);

    if (!response.ok) {
      // Most server errors here are the generic "Failed to..." string,
      // but a few (credit card/loan ownership, "cannot link to both")
      // are specific, user-actionable UserFacingError messages worth
      // showing verbatim rather than papering over with a generic one.
      const body = await response.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : t("saveError"));
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

      <FormField label={t("paymentCategory")} htmlFor="bill-payment-category" helperText={t("paymentCategoryHelper")}>
        <LifeOSSelect
          id="bill-payment-category"
          value={paymentCategory}
          onChange={(e) => setPaymentCategory(e.target.value as PaymentCategory)}
        >
          <option value="regular">{t("paymentCategoryOptions.regular")}</option>
          <option value="credit_card">{t("paymentCategoryOptions.credit_card")}</option>
          <option value="loan">{t("paymentCategoryOptions.loan")}</option>
        </LifeOSSelect>
      </FormField>

      {paymentCategory === "credit_card" && (
        <FormField label={t("selectCreditCard")} htmlFor="bill-linked-credit-card" required>
          <LifeOSSelect id="bill-linked-credit-card" required value={linkedCreditCardId} onChange={(e) => setLinkedCreditCardId(e.target.value)}>
            <option value="">{tCommon("none")}</option>
            {creditCards.map((card) => (
              <option key={card.id} value={card.id}>
                {card.name}
              </option>
            ))}
          </LifeOSSelect>
        </FormField>
      )}

      {paymentCategory === "loan" && (
        <FormField label={t("selectLoan")} htmlFor="bill-linked-loan" required>
          <LifeOSSelect id="bill-linked-loan" required value={linkedLoanId} onChange={(e) => setLinkedLoanId(e.target.value)}>
            <option value="">{tCommon("none")}</option>
            {loans.map((loan) => (
              <option key={loan.id} value={loan.id}>
                {loan.name}
              </option>
            ))}
          </LifeOSSelect>
        </FormField>
      )}

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
