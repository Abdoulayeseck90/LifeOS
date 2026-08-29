"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Business, BusinessStatus } from "@/types/core/entities";
import type { RecordFormRenderProps } from "@/components/core/record-form-modal";
import { FormField } from "@/components/core/form/form-field";
import { LifeOSInput } from "@/components/core/form/lifeos-input";
import { LifeOSSelect } from "@/components/core/form/lifeos-select";
import { LifeOSTextarea } from "@/components/core/form/lifeos-textarea";
import { LifeOSFormActions } from "@/components/core/form/lifeos-form-actions";

const STATUSES: BusinessStatus[] = ["idea", "planning", "active", "paused", "completed", "archived"];

export function BusinessForm({
  business,
  closeAfterSave,
  requestClose,
  registerDirty,
}: { business?: Business } & RecordFormRenderProps) {
  const t = useTranslations("planning.businessForm");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [name, setName] = useState(business?.name ?? "");
  const [description, setDescription] = useState(business?.description ?? "");
  const [category, setCategory] = useState(business?.category ?? "");
  const [status, setStatus] = useState<BusinessStatus>(business?.status ?? "idea");
  const [startDate, setStartDate] = useState(business?.start_date ?? "");
  const [website, setWebsite] = useState(business?.website ?? "");
  const [notes, setNotes] = useState(business?.notes ?? "");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fieldValues = { name, description, category, status, startDate, website, notes };
  const initialSnapshot = useRef(JSON.stringify(fieldValues));
  useEffect(() => {
    registerDirty(JSON.stringify(fieldValues) !== initialSnapshot.current);
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(t("nameRequired"));
      return;
    }

    setSubmitting(true);

    const body = JSON.stringify({
      name: name.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      status,
      start_date: startDate || undefined,
      website: website.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    const response = business
      ? await fetch(`/api/planning/businesses/${business.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body })
      : await fetch("/api/planning/businesses", { method: "POST", headers: { "Content-Type": "application/json" }, body });

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

      <FormField label={t("name")} htmlFor="business-name" required>
        <LifeOSInput id="business-name" type="text" required value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>

      <FormField label={t("description")} htmlFor="business-description" optional>
        <LifeOSTextarea id="business-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("category")} htmlFor="business-category" optional>
          <LifeOSInput id="business-category" type="text" value={category} onChange={(e) => setCategory(e.target.value)} />
        </FormField>

        <FormField label={t("status")} htmlFor="business-status">
          <LifeOSSelect id="business-status" value={status} onChange={(e) => setStatus(e.target.value as BusinessStatus)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`statusOptions.${s}`)}
              </option>
            ))}
          </LifeOSSelect>
        </FormField>

        <FormField label={t("startDate")} htmlFor="business-start-date" optional>
          <LifeOSInput id="business-start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </FormField>

        <FormField label={t("website")} htmlFor="business-website" optional>
          <LifeOSInput id="business-website" type="text" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
        </FormField>
      </div>

      <FormField label={t("notes")} htmlFor="business-notes" optional>
        <LifeOSTextarea id="business-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </FormField>

      <LifeOSFormActions onCancel={requestClose} submitting={submitting} submitLabel={tCommon("save")} />
    </form>
  );
}
