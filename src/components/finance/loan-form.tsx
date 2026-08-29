"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Loan, LoanPaymentFrequency } from "@/types/core/entities";
import type { RecordFormRenderProps } from "@/components/core/record-form-modal";
import { FormField } from "@/components/core/form/form-field";
import { LifeOSInput } from "@/components/core/form/lifeos-input";
import { LifeOSSelect } from "@/components/core/form/lifeos-select";
import { LifeOSTextarea } from "@/components/core/form/lifeos-textarea";
import { LifeOSFormActions } from "@/components/core/form/lifeos-form-actions";

export function LoanForm({ loan, closeAfterSave, requestClose, registerDirty }: { loan?: Loan } & RecordFormRenderProps) {
  const t = useTranslations("finance.loanForm");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [name, setName] = useState(loan?.name ?? "");
  const [originalAmount, setOriginalAmount] = useState(loan?.original_amount != null ? String(loan.original_amount) : "");
  const [balance, setBalance] = useState(loan?.balance != null ? String(loan.balance) : "");
  const [apr, setApr] = useState(loan?.apr != null ? String(loan.apr) : "");
  const [minimumPayment, setMinimumPayment] = useState(loan?.minimum_payment != null ? String(loan.minimum_payment) : "");
  const [paymentFrequency, setPaymentFrequency] = useState<LoanPaymentFrequency | "">(loan?.payment_frequency ?? "monthly");
  const [remainingTermMonths, setRemainingTermMonths] = useState(loan?.remaining_term_months != null ? String(loan.remaining_term_months) : "");
  const [nextPaymentDate, setNextPaymentDate] = useState(loan?.next_payment_date ?? "");
  const [notes, setNotes] = useState(loan?.notes ?? "");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fieldValues = { name, originalAmount, balance, apr, minimumPayment, paymentFrequency, remainingTermMonths, nextPaymentDate, notes };
  const initialSnapshot = useRef(JSON.stringify(fieldValues));
  useEffect(() => {
    registerDirty(JSON.stringify(fieldValues) !== initialSnapshot.current);
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const originalValue = parseFloat(originalAmount);
    const balanceValue = parseFloat(balance);
    const aprValue = parseFloat(apr);

    if (!name.trim()) {
      setError(t("nameRequired"));
      return;
    }
    if (!originalValue || originalValue <= 0) {
      setError(t("originalAmountRequired"));
      return;
    }
    if (Number.isNaN(balanceValue) || balanceValue < 0) {
      setError(t("balanceRequired"));
      return;
    }
    if (Number.isNaN(aprValue) || aprValue < 0) {
      setError(t("aprRequired"));
      return;
    }

    setSubmitting(true);

    const body = JSON.stringify({
      name: name.trim(),
      original_amount: originalValue,
      balance: balanceValue,
      apr: aprValue,
      minimum_payment: minimumPayment ? parseFloat(minimumPayment) : undefined,
      payment_frequency: paymentFrequency || undefined,
      remaining_term_months: remainingTermMonths ? parseInt(remainingTermMonths, 10) : undefined,
      next_payment_date: nextPaymentDate || undefined,
      notes: notes.trim() || undefined,
    });

    const response = loan
      ? await fetch(`/api/finance/loans/${loan.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body })
      : await fetch("/api/finance/loans", { method: "POST", headers: { "Content-Type": "application/json" }, body });

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

      <FormField label={t("name")} htmlFor="loan-name" required>
        <LifeOSInput id="loan-name" type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("originalAmount")} htmlFor="loan-original" required>
          <LifeOSInput id="loan-original" type="number" min={0.01} step="any" required value={originalAmount} onChange={(e) => setOriginalAmount(e.target.value)} />
        </FormField>

        <FormField label={t("balance")} htmlFor="loan-balance" required>
          <LifeOSInput id="loan-balance" type="number" min={0} step="any" required value={balance} onChange={(e) => setBalance(e.target.value)} />
        </FormField>

        <FormField label={t("apr")} htmlFor="loan-apr" required>
          <LifeOSInput id="loan-apr" type="number" min={0} step="any" required value={apr} onChange={(e) => setApr(e.target.value)} />
        </FormField>

        <FormField label={t("minimumPayment")} htmlFor="loan-minimum" optional>
          <LifeOSInput id="loan-minimum" type="number" min={0} step="any" value={minimumPayment} onChange={(e) => setMinimumPayment(e.target.value)} />
        </FormField>

        <FormField label={t("paymentFrequency")} htmlFor="loan-frequency" optional>
          <LifeOSSelect id="loan-frequency" value={paymentFrequency} onChange={(e) => setPaymentFrequency(e.target.value as LoanPaymentFrequency)}>
            <option value="monthly">{t("frequencyOptions.monthly")}</option>
            <option value="biweekly">{t("frequencyOptions.biweekly")}</option>
            <option value="weekly">{t("frequencyOptions.weekly")}</option>
          </LifeOSSelect>
        </FormField>

        <FormField label={t("remainingTerm")} htmlFor="loan-term" optional helperText={t("remainingTermHelper")}>
          <LifeOSInput id="loan-term" type="number" min={0} step="1" value={remainingTermMonths} onChange={(e) => setRemainingTermMonths(e.target.value)} />
        </FormField>

        <FormField label={t("nextPaymentDate")} htmlFor="loan-next-date" optional>
          <LifeOSInput id="loan-next-date" type="date" value={nextPaymentDate} onChange={(e) => setNextPaymentDate(e.target.value)} />
        </FormField>
      </div>

      <FormField label={t("notes")} htmlFor="loan-notes" optional>
        <LifeOSTextarea id="loan-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </FormField>

      <LifeOSFormActions onCancel={requestClose} submitting={submitting} submitLabel={tCommon("save")} />
    </form>
  );
}
