"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { sanitizeFileName } from "@/lib/files";
import type { Condition, Appointment } from "@/types/health/entities";
import type { Document } from "@/types/core/entities";
import type { LabResultWithTest } from "@/services/health/labs";
import type { RecordFormRenderProps } from "@/components/core/record-form-modal";

// Spec Section 39.2 upload flow (minus AI extraction, Phase 5): upload
// the file directly to the private medical-documents bucket from the
// browser (Storage RLS already scopes by {user_id}/... path prefix),
// then create the metadata row via the existing API route. Spec Section
// 32: validate uploaded file types and sizes.
const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

// Hosted inside RecordFormModal — see appointment-form.tsx for the
// pattern. Passing `document` switches this into edit mode (PATCH
// against /api/health/documents/[id] instead of POST) — metadata only,
// same as Personal Documents' equivalent form: the file input disappears
// entirely rather than allowing a re-upload, since the underlying
// Storage file is fixed once uploaded.
export function DocumentUploadForm({
  conditions,
  appointments,
  labResults,
  document,
  closeAfterSave,
  requestClose,
  registerDirty,
}: {
  conditions: Condition[];
  appointments: Appointment[];
  labResults: LabResultWithTest[];
  document?: Document;
} & RecordFormRenderProps) {
  const t = useTranslations("documents.form");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(document?.name ?? "");
  const [type, setType] = useState(document?.type ?? "lab_report");
  const [documentDate, setDocumentDate] = useState(document?.document_date ?? "");
  const [provider, setProvider] = useState(document?.provider ?? "");
  const [relatedConditionId, setRelatedConditionId] = useState(document?.related_condition_id ?? "");
  const [relatedAppointmentId, setRelatedAppointmentId] = useState(document?.related_appointment_id ?? "");
  const [relatedLabResultIds, setRelatedLabResultIds] = useState<string[]>(document?.related_lab_result_ids ?? []);
  const [fileName, setFileName] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  function toggleLabResult(id: string) {
    setRelatedLabResultIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const fieldValues = {
    name,
    type,
    documentDate,
    provider,
    relatedConditionId,
    relatedAppointmentId,
    relatedLabResultIds,
    fileName,
  };
  const initialSnapshot = useRef(JSON.stringify(fieldValues));
  useEffect(() => {
    registerDirty(JSON.stringify(fieldValues) !== initialSnapshot.current);
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (document) {
      // Edit mode: metadata only, no file. Clearing a date/relation
      // needs an explicit null (undefined would just be "leave
      // unchanged" on a partial PATCH) — same convention as Personal
      // Documents' edit path.
      setSubmitting(true);

      const response = await fetch(`/api/health/documents/${document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          document_date: documentDate || null,
          provider: provider.trim() || null,
          related_condition_id: relatedConditionId || null,
          related_appointment_id: relatedAppointmentId || null,
          related_lab_result_ids: relatedLabResultIds,
        }),
      });

      setSubmitting(false);

      if (!response.ok) {
        setError(t("saveError"));
        return;
      }

      registerDirty(false);
      closeAfterSave();
      router.refresh();
      return;
    }

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError(t("fileRequired"));
      return;
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError(t("fileTypeInvalid"));
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(t("fileTooLarge"));
      return;
    }

    setSubmitting(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      setError(t("saveError"));
      return;
    }

    const documentId = crypto.randomUUID();
    const storagePath = `${user.id}/${documentId}/${sanitizeFileName(file.name)}`;

    const { error: uploadError } = await supabase.storage.from("medical-documents").upload(storagePath, file);
    if (uploadError) {
      setSubmitting(false);
      setError(t("uploadError"));
      return;
    }

    const response = await fetch("/api/health/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim() || file.name,
        type,
        storage_path: storagePath,
        mime_type: file.type,
        file_size: file.size,
        document_date: documentDate || undefined,
        provider: provider.trim() || undefined,
        related_condition_id: relatedConditionId || undefined,
        related_appointment_id: relatedAppointmentId || undefined,
        related_lab_result_ids: relatedLabResultIds,
      }),
    });

    setSubmitting(false);

    if (!response.ok) {
      // Metadata write failed after the file made it to storage —
      // clean up rather than leave an orphaned object behind.
      await supabase.storage.from("medical-documents").remove([storagePath]);
      setError(t("saveError"));
      return;
    }

    registerDirty(false);
    closeAfterSave();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <p className="text-sm text-status-urgent">{error}</p>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {!document && (
          <label className="flex flex-col gap-1.5 text-sm text-muted md:col-span-3">
            {t("file")}
            <input
              ref={fileInputRef}
              type="file"
              required
              accept={ALLOWED_MIME_TYPES.join(",")}
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
        )}

        <label className="flex flex-col gap-1.5 text-sm text-muted md:col-span-2">
          {t("name")}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("type")}
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          >
            <option value="lab_report">{t("typeOptions.lab_report")}</option>
            <option value="imaging">{t("typeOptions.imaging")}</option>
            <option value="prescription">{t("typeOptions.prescription")}</option>
            <option value="appointment_summary">{t("typeOptions.appointment_summary")}</option>
            <option value="doctor_notes">{t("typeOptions.doctor_notes")}</option>
            <option value="other">{t("typeOptions.other")}</option>
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-fit text-sm text-primary hover:underline"
      >
        {expanded ? t("fewerDetails") : t("moreDetails")}
      </button>

      {expanded && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("documentDate")}
            <input
              type="date"
              value={documentDate}
              onChange={(e) => setDocumentDate(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("provider")}
            <input
              type="text"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("relatedCondition")}
            <select
              value={relatedConditionId}
              onChange={(e) => setRelatedConditionId(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            >
              <option value="">{t("none")}</option>
              {conditions.map((condition) => (
                <option key={condition.id} value={condition.id}>
                  {condition.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("relatedAppointment")}
            <select
              value={relatedAppointmentId}
              onChange={(e) => setRelatedAppointmentId(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            >
              <option value="">{t("none")}</option>
              {appointments.map((appointment) => (
                <option key={appointment.id} value={appointment.id}>
                  {appointment.provider_name} — {appointment.date_time}
                </option>
              ))}
            </select>
          </label>

          {labResults.length > 0 && (
            <div className="flex flex-col gap-1.5 text-sm text-muted md:col-span-3">
              {t("relatedLabResults")}
              <div className="max-h-40 overflow-y-auto rounded border border-surface p-2">
                {labResults.map((result) => (
                  <label key={result.id} className="flex items-center gap-2 py-1 text-sm text-secondary">
                    <input
                      type="checkbox"
                      checked={relatedLabResultIds.includes(result.id)}
                      onChange={() => toggleLabResult(result.id)}
                    />
                    {result.test_definitions?.name_en ?? t("unknownTest")} — {result.collection_date}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={requestClose}
          className="rounded border border-surface px-4 py-2 text-sm text-secondary"
        >
          {tCommon("cancel")}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {submitting && !document ? t("uploading") : tCommon("save")}
        </button>
      </div>
    </form>
  );
}
