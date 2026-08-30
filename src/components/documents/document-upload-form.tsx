"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Camera, FileText, Image as ImageIcon, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sanitizeFileName } from "@/lib/files";
import type { FinanceTransaction, PersonalDocument, PersonalDocumentType } from "@/types/core/entities";
import type { RecordFormRenderProps } from "@/components/core/record-form-modal";
import { FormField } from "@/components/core/form/form-field";
import { LifeOSInput } from "@/components/core/form/lifeos-input";
import { LifeOSSelect } from "@/components/core/form/lifeos-select";
import { LifeOSTextarea } from "@/components/core/form/lifeos-textarea";
import { LifeOSCheckbox } from "@/components/core/form/lifeos-checkbox";
import { LifeOSFormActions } from "@/components/core/form/lifeos-form-actions";

const DOCUMENT_TYPES: PersonalDocumentType[] = [
  "personal_document",
  "receipt",
  "certificate",
  "contract",
  "identification",
  "financial_document",
  "insurance_document",
  "employment_document",
  "military_document",
  "education_document",
  "other",
];

const SUGGESTED_CATEGORIES = [
  "Identity",
  "Education",
  "Legal",
  "Financial",
  "Employment",
  "Insurance",
  "Military",
  "Personal",
  "Receipts",
  "Other",
];

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

// Documents spec, Sections 67-72: one unified form for every document
// type, including Receipt (Section 70: "Do NOT create a separate
// receipt module" — document_type = "receipt" just reveals a few extra
// fields, section 72). Create mode requires a file (uploaded directly
// to the private personal-documents bucket from the browser, mirroring
// the same pattern Health's document-upload-form.tsx and the
// just-removed receipt-upload-form.tsx both used); edit mode has no
// file input at all — the file is fixed at upload time, and editing
// name here doubles as "Rename" (Section 73) rather than a separate
// rename-only flow, since neither exists elsewhere in the app.
export function DocumentUploadForm({
  document,
  initialDocumentType,
  unlinkedExpenses,
  linkedExpense,
  closeAfterSave,
  requestClose,
  registerDirty,
}: {
  document?: PersonalDocument;
  initialDocumentType?: PersonalDocumentType;
  unlinkedExpenses: FinanceTransaction[];
  linkedExpense?: FinanceTransaction | null;
} & RecordFormRenderProps) {
  const t = useTranslations("personalDocuments.form");
  const tTypes = useTranslations("personalDocuments.types");
  const tCommon = useTranslations("common");
  const router = useRouter();
  // Security-audit-adjacent UX bug: a single <input capture="environment">
  // forces mobile browsers straight into the camera, skipping the OS's
  // own "choose source" sheet entirely — there was never a way to pick
  // an existing photo or a non-image file from that one input. Three
  // separate hidden inputs, each with the exact accept/capture combo for
  // its one purpose, restore all three sources as explicit buttons.
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const chooseFileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(document?.name ?? "");
  const [documentType, setDocumentType] = useState<PersonalDocumentType>(document?.document_type ?? initialDocumentType ?? "personal_document");
  const [category, setCategory] = useState(document?.category ?? "");
  const [description, setDescription] = useState(document?.description ?? "");
  const [tags, setTags] = useState(document?.tags.join(", ") ?? "");
  const [expirationDate, setExpirationDate] = useState(document?.expiration_date ?? "");
  const [remindersEnabled, setRemindersEnabled] = useState(document?.reminders_enabled ?? true);
  const [reminderLeadDays, setReminderLeadDays] = useState(document?.reminder_lead_days != null ? String(document.reminder_lead_days) : "30");
  const [notes, setNotes] = useState(document?.notes ?? "");
  const [merchant, setMerchant] = useState(document?.merchant ?? "");
  const [amount, setAmount] = useState(document?.amount != null ? String(document.amount) : "");
  const [purchaseDate, setPurchaseDate] = useState(document?.purchase_date ?? "");
  const [paymentMethod, setPaymentMethod] = useState(document?.payment_method ?? "");
  const [relatedExpenseId, setRelatedExpenseId] = useState(document?.related_expense_id ?? "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileName = selectedFile?.name ?? "";

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isReceipt = documentType === "receipt";
  const selectableExpenses =
    linkedExpense && !unlinkedExpenses.some((e) => e.id === linkedExpense.id) ? [linkedExpense, ...unlinkedExpenses] : unlinkedExpenses;

  const fieldValues = {
    name,
    documentType,
    category,
    description,
    tags,
    expirationDate,
    remindersEnabled,
    reminderLeadDays,
    notes,
    merchant,
    amount,
    purchaseDate,
    paymentMethod,
    relatedExpenseId,
    fileName,
  };
  const initialSnapshot = useRef(JSON.stringify(fieldValues));
  useEffect(() => {
    registerDirty(JSON.stringify(fieldValues) !== initialSnapshot.current);
  });

  function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null);
  }

  function clearSelectedFile() {
    setSelectedFile(null);
    // Reset every input's own FileList too — without this, re-picking the
    // exact same file from the same source afterward wouldn't fire
    // onChange again (the browser treats it as no change).
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (libraryInputRef.current) libraryInputRef.current.value = "";
    if (chooseFileInputRef.current) chooseFileInputRef.current.value = "";
  }

  function toTagsArray(value: string): string[] {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(t("nameRequired"));
      return;
    }
    if (isReceipt && merchant.trim() && (amount === "" || Number.isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)) {
      setError(t("amountRequired"));
      return;
    }

    const sharedMetadata = {
      name: name.trim(),
      document_type: documentType,
      category: category.trim() || undefined,
      description: description.trim() || undefined,
      tags: toTagsArray(tags),
      expiration_date: expirationDate || undefined,
      reminders_enabled: expirationDate ? remindersEnabled : undefined,
      reminder_lead_days: expirationDate && reminderLeadDays ? parseInt(reminderLeadDays, 10) : undefined,
      notes: notes.trim() || undefined,
      merchant: isReceipt ? merchant.trim() || undefined : undefined,
      amount: isReceipt && amount ? parseFloat(amount) : undefined,
      purchase_date: isReceipt ? purchaseDate || undefined : undefined,
      payment_method: isReceipt ? paymentMethod.trim() || undefined : undefined,
      related_expense_id: isReceipt ? relatedExpenseId || undefined : undefined,
    };

    setSubmitting(true);

    if (document) {
      // Edit mode: metadata only, no file. Clearing expiration_date
      // needs an explicit null (undefined would just be "leave
      // unchanged" on a partial PATCH).
      const response = await fetch(`/api/documents/${document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...sharedMetadata,
          expiration_date: expirationDate || null,
          related_expense_id: isReceipt ? relatedExpenseId || null : null,
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

    // Create mode: file is required and uploaded directly to Storage
    // before the metadata row exists.
    const file = selectedFile;
    if (!file) {
      setSubmitting(false);
      setError(t("fileRequired"));
      return;
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setSubmitting(false);
      setError(t("fileTypeInvalid"));
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setSubmitting(false);
      setError(t("fileTooLarge"));
      return;
    }

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

    const { error: uploadError } = await supabase.storage.from("personal-documents").upload(storagePath, file);
    if (uploadError) {
      setSubmitting(false);
      setError(t("uploadError"));
      return;
    }

    const response = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...sharedMetadata,
        storage_path: storagePath,
        mime_type: file.type,
        file_size: file.size,
      }),
    });

    setSubmitting(false);

    if (!response.ok) {
      // Metadata write failed after the file made it to storage — clean
      // up rather than leave an orphaned object behind (Section 79).
      await supabase.storage.from("personal-documents").remove([storagePath]);
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

      {!document && (
        <FormField label={t("file")} htmlFor="document-file" required helperText={t("fileHelper")}>
          <div className="flex flex-col gap-2">
            {/* Take Picture: image-only, camera launches directly — the
                one input that should ever carry capture="environment". */}
            <input
              ref={cameraInputRef}
              type="file"
              accept={IMAGE_MIME_TYPES.join(",")}
              capture="environment"
              onChange={handleFileSelected}
              className="hidden"
            />
            {/* Photo Library: same image types, no capture — opens the
                OS photo picker instead of forcing the camera. */}
            <input ref={libraryInputRef} type="file" accept={IMAGE_MIME_TYPES.join(",")} onChange={handleFileSelected} className="hidden" />
            {/* Choose File: every supported format (incl. PDF), no capture.
                No explicit id here — FormField's htmlFor="document-file"
                already clones that id onto this whole wrapper div (its
                direct child), and duplicating it here would be an
                invalid-HTML id collision. All three inputs are opened via
                ref/click(), never native label-for association. */}
            <input ref={chooseFileInputRef} type="file" accept={ALLOWED_MIME_TYPES.join(",")} onChange={handleFileSelected} className="hidden" />

            {fileName ? (
              <div className="flex items-center justify-between gap-2 rounded border border-slate-300 bg-white px-3.5 py-3 text-sm text-secondary">
                <span className="truncate">{fileName}</span>
                <button
                  type="button"
                  onClick={clearSelectedFile}
                  aria-label={t("removeFile")}
                  className="shrink-0 rounded p-1 text-muted hover:bg-surface hover:text-secondary"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                {/* Camera/Photo Library aren't meaningful concepts on
                    desktop (capture is simply ignored there) — hidden past
                    the sm breakpoint per spec, Choose File covers it. */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-1 items-center justify-center gap-2 rounded border border-slate-300 bg-white px-3.5 py-3 text-sm font-medium text-secondary hover:bg-surface sm:hidden"
                >
                  <Camera size={16} />
                  {t("takePicture")}
                </button>
                <button
                  type="button"
                  onClick={() => libraryInputRef.current?.click()}
                  className="flex flex-1 items-center justify-center gap-2 rounded border border-slate-300 bg-white px-3.5 py-3 text-sm font-medium text-secondary hover:bg-surface sm:hidden"
                >
                  <ImageIcon size={16} />
                  {t("photoLibrary")}
                </button>
                <button
                  type="button"
                  onClick={() => chooseFileInputRef.current?.click()}
                  className="flex flex-1 items-center justify-center gap-2 rounded border border-slate-300 bg-white px-3.5 py-3 text-sm font-medium text-secondary hover:bg-surface"
                >
                  <FileText size={16} />
                  {t("chooseFile")}
                </button>
              </div>
            )}
          </div>
        </FormField>
      )}

      <FormField label={t("name")} htmlFor="document-name" required>
        <LifeOSInput id="document-name" type="text" required value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("documentType")} htmlFor="document-type">
          <LifeOSSelect id="document-type" value={documentType} onChange={(e) => setDocumentType(e.target.value as PersonalDocumentType)}>
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {tTypes(type)}
              </option>
            ))}
          </LifeOSSelect>
        </FormField>

        <FormField label={t("category")} htmlFor="document-category" optional>
          <LifeOSInput id="document-category" type="text" list="document-category-suggestions" value={category} onChange={(e) => setCategory(e.target.value)} />
          <datalist id="document-category-suggestions">
            {SUGGESTED_CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </FormField>

        <FormField label={t("expirationDate")} htmlFor="document-expiration" optional>
          <LifeOSInput id="document-expiration" type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} />
        </FormField>

        <FormField label={t("tags")} htmlFor="document-tags" optional helperText={t("tagsHelper")}>
          <LifeOSInput id="document-tags" type="text" value={tags} onChange={(e) => setTags(e.target.value)} />
        </FormField>
      </div>

      {expirationDate && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <LifeOSCheckbox label={t("remindersEnabled")} checked={remindersEnabled} onChange={(e) => setRemindersEnabled(e.target.checked)} />
          {remindersEnabled && (
            <FormField label={t("reminderLeadDays")} htmlFor="document-reminder-lead-days">
              <LifeOSInput
                id="document-reminder-lead-days"
                type="number"
                min={1}
                value={reminderLeadDays}
                onChange={(e) => setReminderLeadDays(e.target.value)}
              />
            </FormField>
          )}
        </div>
      )}

      <FormField label={t("description")} htmlFor="document-description" optional>
        <LifeOSTextarea id="document-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </FormField>

      {isReceipt && (
        <div className="flex flex-col gap-4 rounded-card border border-surface p-3">
          <p className="text-sm font-medium text-secondary">{t("receiptSectionTitle")}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t("merchant")} htmlFor="document-merchant" optional>
              <LifeOSInput id="document-merchant" type="text" value={merchant} onChange={(e) => setMerchant(e.target.value)} />
            </FormField>
            <FormField label={t("amount")} htmlFor="document-amount" optional>
              <LifeOSInput id="document-amount" type="number" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </FormField>
            <FormField label={t("purchaseDate")} htmlFor="document-purchase-date" optional>
              <LifeOSInput id="document-purchase-date" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
            </FormField>
            <FormField label={t("paymentMethod")} htmlFor="document-payment-method" optional>
              <LifeOSInput id="document-payment-method" type="text" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} />
            </FormField>
            <FormField label={t("relatedExpense")} htmlFor="document-related-expense" optional helperText={t("relatedExpenseHelper")}>
              <LifeOSSelect id="document-related-expense" value={relatedExpenseId} onChange={(e) => setRelatedExpenseId(e.target.value)}>
                <option value="">{tCommon("none")}</option>
                {selectableExpenses.map((expense) => (
                  <option key={expense.id} value={expense.id}>
                    {expense.description} — {expense.date} ({expense.amount})
                  </option>
                ))}
              </LifeOSSelect>
            </FormField>
          </div>
        </div>
      )}

      <FormField label={t("notes")} htmlFor="document-notes" optional>
        <LifeOSTextarea id="document-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </FormField>

      <LifeOSFormActions onCancel={requestClose} submitting={submitting} submitLabel={submitting && !document ? t("uploading") : tCommon("save")} />
    </form>
  );
}
