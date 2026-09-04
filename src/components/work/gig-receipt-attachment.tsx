"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Paperclip, Eye, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sanitizeFileName } from "@/lib/files";
import type { PersonalDocument } from "@/types/core/entities";
import { DocumentPreviewModal } from "@/components/documents/document-preview-modal";

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

// Gig Driving spec: "reuse the existing Documents/Receipts system for
// attachments" via the two new nullable FKs on personal_documents
// (related_gig_expense_id/related_gig_maintenance_id) — same private
// personal-documents bucket and /api/documents metadata row every other
// document uses, just a smaller upload surface than the full
// DocumentUploadForm (which is built around FinanceTransaction linking
// that doesn't apply here).
export function GigReceiptAttachment({
  relatedGigExpenseId,
  relatedGigMaintenanceId,
  documents,
}: {
  relatedGigExpenseId?: string;
  relatedGigMaintenanceId?: string;
  documents: PersonalDocument[];
}) {
  const t = useTranslations("gigDriving.receipts");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<PersonalDocument | null>(null);

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError(t("fileTypeInvalid"));
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(t("fileTooLarge"));
      return;
    }

    setUploading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUploading(false);
      setError(t("saveError"));
      return;
    }

    const documentId = crypto.randomUUID();
    const storagePath = `${user.id}/${documentId}/${sanitizeFileName(file.name)}`;

    const { error: uploadError } = await supabase.storage.from("personal-documents").upload(storagePath, file);
    if (uploadError) {
      setUploading(false);
      setError(t("uploadError"));
      return;
    }

    const response = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: file.name,
        storage_path: storagePath,
        mime_type: file.type,
        file_size: file.size,
        document_type: "receipt",
        related_gig_expense_id: relatedGigExpenseId,
        related_gig_maintenance_id: relatedGigMaintenanceId,
      }),
    });

    setUploading(false);

    if (!response.ok) {
      await supabase.storage.from("personal-documents").remove([storagePath]);
      setError(t("saveError"));
      return;
    }

    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t("deleteConfirm"))) return;
    const response = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  }

  return (
    <div className="flex flex-col gap-1.5">
      {documents.length > 0 && (
        <ul className="flex flex-col gap-1">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-2 text-xs text-secondary">
              <button type="button" onClick={() => setPreviewDoc(doc)} className="inline-flex items-center gap-1 hover:underline">
                <Eye size={12} /> {doc.name}
              </button>
              <button type="button" onClick={() => handleDelete(doc.id)} className="min-h-11 min-w-11 text-muted hover:text-status-urgent" aria-label={t("delete")}>
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-xs text-status-urgent">{error}</p>}

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="inline-flex w-fit items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
      >
        <Paperclip size={12} /> {uploading ? t("uploading") : t("attachReceipt")}
      </button>
      <input ref={fileInputRef} type="file" accept={ALLOWED_MIME_TYPES.join(",")} onChange={handleFileSelected} className="hidden" />

      {previewDoc && (
        <DocumentPreviewModal
          documentId={previewDoc.id}
          name={previewDoc.name}
          mimeType={previewDoc.mime_type}
          open={Boolean(previewDoc)}
          onOpenChange={(open) => !open && setPreviewDoc(null)}
        />
      )}
    </div>
  );
}
