"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { CreditCard } from "@/types/core/entities";
import type { RecordFormRenderProps } from "@/components/core/record-form-modal";
import { FormField } from "@/components/core/form/form-field";
import { LifeOSInput } from "@/components/core/form/lifeos-input";
import { LifeOSTextarea } from "@/components/core/form/lifeos-textarea";
import { LifeOSFormActions } from "@/components/core/form/lifeos-form-actions";

export function CreditCardForm({ card, closeAfterSave, requestClose, registerDirty }: { card?: CreditCard } & RecordFormRenderProps) {
  const t = useTranslations("finance.creditCardForm");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [name, setName] = useState(card?.name ?? "");
  const [balance, setBalance] = useState(card?.balance != null ? String(card.balance) : "");
  const [creditLimit, setCreditLimit] = useState(card?.credit_limit != null ? String(card.credit_limit) : "");
  const [apr, setApr] = useState(card?.apr != null ? String(card.apr) : "");
  const [minimumPayment, setMinimumPayment] = useState(card?.minimum_payment != null ? String(card.minimum_payment) : "");
  const [currentPayment, setCurrentPayment] = useState(card?.current_payment != null ? String(card.current_payment) : "");
  const [dueDate, setDueDate] = useState(card?.due_date ?? "");
  const [notes, setNotes] = useState(card?.notes ?? "");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fieldValues = { name, balance, creditLimit, apr, minimumPayment, currentPayment, dueDate, notes };
  const initialSnapshot = useRef(JSON.stringify(fieldValues));
  useEffect(() => {
    registerDirty(JSON.stringify(fieldValues) !== initialSnapshot.current);
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const balanceValue = parseFloat(balance);
    const limitValue = parseFloat(creditLimit);
    const aprValue = parseFloat(apr);

    if (!name.trim()) {
      setError(t("nameRequired"));
      return;
    }
    if (Number.isNaN(balanceValue) || balanceValue < 0) {
      setError(t("balanceRequired"));
      return;
    }
    if (!limitValue || limitValue <= 0) {
      setError(t("limitRequired"));
      return;
    }
    if (Number.isNaN(aprValue) || aprValue < 0) {
      setError(t("aprRequired"));
      return;
    }

    setSubmitting(true);

    const body = JSON.stringify({
      name: name.trim(),
      balance: balanceValue,
      credit_limit: limitValue,
      apr: aprValue,
      minimum_payment: minimumPayment ? parseFloat(minimumPayment) : undefined,
      current_payment: currentPayment ? parseFloat(currentPayment) : undefined,
      due_date: dueDate || undefined,
      notes: notes.trim() || undefined,
    });

    const response = card
      ? await fetch(`/api/finance/credit-cards/${card.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body })
      : await fetch("/api/finance/credit-cards", { method: "POST", headers: { "Content-Type": "application/json" }, body });

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

      <FormField label={t("name")} htmlFor="cc-name" required>
        <LifeOSInput id="cc-name" type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("balance")} htmlFor="cc-balance" required>
          <LifeOSInput id="cc-balance" type="number" min={0} step="any" required value={balance} onChange={(e) => setBalance(e.target.value)} />
        </FormField>

        <FormField label={t("creditLimit")} htmlFor="cc-limit" required>
          <LifeOSInput id="cc-limit" type="number" min={0} step="any" required value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} />
        </FormField>

        <FormField label={t("apr")} htmlFor="cc-apr" required helperText={t("aprHelper")}>
          <LifeOSInput id="cc-apr" type="number" min={0} step="any" required value={apr} onChange={(e) => setApr(e.target.value)} />
        </FormField>

        <FormField label={t("minimumPayment")} htmlFor="cc-minimum" optional>
          <LifeOSInput id="cc-minimum" type="number" min={0} step="any" value={minimumPayment} onChange={(e) => setMinimumPayment(e.target.value)} />
        </FormField>

        <FormField label={t("currentPayment")} htmlFor="cc-current" optional helperText={t("currentPaymentHelper")}>
          <LifeOSInput id="cc-current" type="number" min={0} step="any" value={currentPayment} onChange={(e) => setCurrentPayment(e.target.value)} />
        </FormField>

        <FormField label={t("dueDate")} htmlFor="cc-due-date" optional>
          <LifeOSInput id="cc-due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </FormField>
      </div>

      <FormField label={t("notes")} htmlFor="cc-notes" optional>
        <LifeOSTextarea id="cc-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </FormField>

      <LifeOSFormActions onCancel={requestClose} submitting={submitting} submitLabel={tCommon("save")} />
    </form>
  );
}
