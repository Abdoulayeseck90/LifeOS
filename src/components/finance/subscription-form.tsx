"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Subscription, SubscriptionBillingFrequency, SubscriptionStatus } from "@/types/core/entities";
import type { RecordFormRenderProps } from "@/components/core/record-form-modal";
import { FormField } from "@/components/core/form/form-field";
import { LifeOSInput } from "@/components/core/form/lifeos-input";
import { LifeOSSelect } from "@/components/core/form/lifeos-select";
import { LifeOSTextarea } from "@/components/core/form/lifeos-textarea";
import { LifeOSCheckbox } from "@/components/core/form/lifeos-checkbox";
import { LifeOSFormActions } from "@/components/core/form/lifeos-form-actions";

const FREQUENCIES: SubscriptionBillingFrequency[] = ["weekly", "monthly", "quarterly", "yearly"];

// Subscriptions spec, Section 29: this form only captures the recurring
// service definition (name/amount/cycle/next billing date) — the
// actual charges it produces are recorded separately via "Record
// Charge" (subscription-card.tsx), never edited here.
export function SubscriptionForm({
  subscription,
  closeAfterSave,
  requestClose,
  registerDirty,
}: { subscription?: Subscription } & RecordFormRenderProps) {
  const t = useTranslations("finance.subscriptionForm");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [name, setName] = useState(subscription?.name ?? "");
  const [amount, setAmount] = useState(subscription?.amount != null ? String(subscription.amount) : "");
  const [billingFrequency, setBillingFrequency] = useState<SubscriptionBillingFrequency>(subscription?.billing_frequency ?? "monthly");
  const [nextBillingDate, setNextBillingDate] = useState(subscription?.next_billing_date ?? "");
  const [category, setCategory] = useState(subscription?.category ?? "");
  const [paymentMethod, setPaymentMethod] = useState(subscription?.payment_method ?? "");
  const [autoRenewal, setAutoRenewal] = useState(subscription?.auto_renewal ?? true);
  const [website, setWebsite] = useState(subscription?.website ?? "");
  const [remindersEnabled, setRemindersEnabled] = useState(subscription?.reminders_enabled ?? true);
  const [status, setStatus] = useState<SubscriptionStatus>(subscription?.status ?? "active");
  const [notes, setNotes] = useState(subscription?.notes ?? "");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fieldValues = { name, amount, billingFrequency, nextBillingDate, category, paymentMethod, autoRenewal, website, remindersEnabled, status, notes };
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
    if (!nextBillingDate) {
      setError(t("nextBillingDateRequired"));
      return;
    }

    setSubmitting(true);

    const body = JSON.stringify({
      name: name.trim(),
      amount: amountValue,
      billing_frequency: billingFrequency,
      next_billing_date: nextBillingDate,
      category: category.trim() || undefined,
      payment_method: paymentMethod.trim() || undefined,
      auto_renewal: autoRenewal,
      website: website.trim() || undefined,
      reminders_enabled: remindersEnabled,
      status: subscription ? status : undefined,
      notes: notes.trim() || undefined,
    });

    const response = subscription
      ? await fetch(`/api/finance/subscriptions/${subscription.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body })
      : await fetch("/api/finance/subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body });

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

      <FormField label={t("name")} htmlFor="subscription-name" required>
        <LifeOSInput
          id="subscription-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("amount")} htmlFor="subscription-amount" required>
          <LifeOSInput id="subscription-amount" type="number" min={0} step="any" required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </FormField>

        <FormField label={t("billingFrequency")} htmlFor="subscription-frequency">
          <LifeOSSelect
            id="subscription-frequency"
            value={billingFrequency}
            onChange={(e) => setBillingFrequency(e.target.value as SubscriptionBillingFrequency)}
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {t(`frequencyOptions.${f}`)}
              </option>
            ))}
          </LifeOSSelect>
        </FormField>

        <FormField label={t("nextBillingDate")} htmlFor="subscription-next-date" required>
          <LifeOSInput
            id="subscription-next-date"
            type="date"
            required
            value={nextBillingDate}
            onChange={(e) => setNextBillingDate(e.target.value)}
          />
        </FormField>

        <FormField label={t("category")} htmlFor="subscription-category" optional>
          <LifeOSInput id="subscription-category" type="text" value={category} onChange={(e) => setCategory(e.target.value)} />
        </FormField>

        <FormField label={t("paymentMethod")} htmlFor="subscription-payment-method" optional>
          <LifeOSInput id="subscription-payment-method" type="text" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} />
        </FormField>

        <FormField label={t("website")} htmlFor="subscription-website" optional>
          <LifeOSInput id="subscription-website" type="text" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </FormField>

        {subscription && (
          <FormField label={t("status")} htmlFor="subscription-status">
            <LifeOSSelect id="subscription-status" value={status} onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}>
              <option value="active">{t("statusOptions.active")}</option>
              <option value="paused">{t("statusOptions.paused")}</option>
              <option value="cancelled">{t("statusOptions.cancelled")}</option>
            </LifeOSSelect>
          </FormField>
        )}
      </div>

      <LifeOSCheckbox label={t("autoRenewal")} checked={autoRenewal} onChange={(e) => setAutoRenewal(e.target.checked)} />
      <LifeOSCheckbox label={t("remindersEnabled")} checked={remindersEnabled} onChange={(e) => setRemindersEnabled(e.target.checked)} />

      <FormField label={t("notes")} htmlFor="subscription-notes" optional>
        <LifeOSTextarea id="subscription-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </FormField>

      <LifeOSFormActions onCancel={requestClose} submitting={submitting} submitLabel={tCommon("save")} />
    </form>
  );
}
