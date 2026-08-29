"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pin, Eye, Download, Pencil, Trash2 } from "lucide-react";
import type { FinanceTransaction, PersonalDocument } from "@/types/core/entities";
import { DocumentTypeBadge } from "@/components/documents/document-type-badge";
import { DocumentExpirationBadge } from "@/components/documents/document-expiration-badge";
import { DocumentPreviewModal } from "@/components/documents/document-preview-modal";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { RecordFormModal } from "@/components/core/record-form-modal";
import { ConfirmDialog } from "@/components/core/confirm-dialog";

// Section 73's action list — View, Download, Rename, Edit metadata,
// Pin, Delete. Rename is folded into "Edit metadata" (name is just the
// first field of that form) since no separate rename-only pattern
// exists anywhere else in the app.
export function DocumentCard({
  document,
  unlinkedExpenses,
  expensesById,
}: {
  document: PersonalDocument;
  unlinkedExpenses: FinanceTransaction[];
  expensesById: Map<string, FinanceTransaction>;
}) {
  const t = useTranslations("personalDocuments");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [pinning, setPinning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const linkedExpense = document.related_expense_id ? (expensesById.get(document.related_expense_id) ?? null) : null;

  async function handleDownload() {
    setDownloading(true);
    setActionError(null);

    const response = await fetch(`/api/documents/${document.id}/signed-url`);
    const body = await response.json().catch(() => null);

    if (!response.ok || !body?.url) {
      setDownloading(false);
      setActionError(t("downloadError"));
      return;
    }

    try {
      const fileResponse = await fetch(body.url);
      const blob = await fileResponse.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = objectUrl;
      link.download = document.name;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setActionError(t("downloadError"));
    } finally {
      setDownloading(false);
    }
  }

  async function handleTogglePin() {
    setPinning(true);
    setActionError(null);

    const response = await fetch(`/api/documents/${document.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !document.pinned }),
    });

    setPinning(false);

    if (!response.ok) {
      setActionError(t("pinError"));
      return;
    }

    router.refresh();
  }

  async function handleDelete() {
    const response = await fetch(`/api/documents/${document.id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  }

  return (
    <div className="rounded-card border border-surface bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-secondary">{document.name}</p>
          {document.category && <p className="text-xs text-muted">{document.category}</p>}
        </div>
        <button
          type="button"
          onClick={handleTogglePin}
          disabled={pinning}
          aria-label={document.pinned ? t("unpin") : t("pin")}
          aria-pressed={document.pinned}
          className={`shrink-0 rounded p-1 disabled:opacity-50 ${document.pinned ? "text-primary" : "text-muted hover:text-primary"}`}
        >
          <Pin size={18} fill={document.pinned ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <DocumentTypeBadge type={document.document_type} />
        <DocumentExpirationBadge expirationDate={document.expiration_date} />
      </div>

      {document.document_type === "receipt" && document.merchant && (
        <p className="mt-2 text-sm text-secondary">
          {document.merchant}
          {document.amount != null && ` — ${document.amount.toLocaleString(undefined, { style: "currency", currency: "USD" })}`}
        </p>
      )}
      {document.document_type === "receipt" && (
        <p className="mt-1 text-xs text-muted">{linkedExpense ? `${t("linkedTo")}: ${linkedExpense.description}` : t("notLinked")}</p>
      )}

      {actionError && <p className="mt-2 text-xs text-status-urgent">{actionError}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button type="button" onClick={() => setPreviewOpen(true)} className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
          <Eye size={14} />
          {t("view")}
        </button>
        <button type="button" onClick={handleDownload} disabled={downloading} className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline disabled:opacity-50">
          <Download size={14} />
          {downloading ? tCommon("loading") : t("download")}
        </button>

        <RecordFormModal
          trigger={(open) => (
            <button type="button" onClick={open} className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
              <Pencil size={14} />
              {t("editMetadata")}
            </button>
          )}
          modalTitle={t("editTitle")}
        >
          {(modalProps) => (
            <DocumentUploadForm document={document} unlinkedExpenses={unlinkedExpenses} linkedExpense={linkedExpense} {...modalProps} />
          )}
        </RecordFormModal>

        <ConfirmDialog
          trigger={(open) => (
            <button type="button" onClick={open} className="inline-flex items-center gap-1.5 text-xs text-status-urgent hover:underline">
              <Trash2 size={14} />
              {tCommon("delete")}
            </button>
          )}
          title={t("deleteConfirmTitle")}
          description={t("deleteConfirmMessage")}
          onConfirm={handleDelete}
        />
      </div>

      <DocumentPreviewModal
        documentId={document.id}
        name={document.name}
        mimeType={document.mime_type}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}
