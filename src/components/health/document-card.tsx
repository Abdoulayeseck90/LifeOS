"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Document } from "@/types/core/entities";
import { DocumentViewLink } from "@/components/health/document-view-link";
import { ConfirmDialog } from "@/components/core/confirm-dialog";

export function DocumentCard({ document }: { document: Document }) {
  const t = useTranslations("documents");
  const tCommon = useTranslations("common");
  const router = useRouter();

  async function handleDelete() {
    const response = await fetch(`/api/health/documents/${document.id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  }

  return (
    <div className="flex items-center justify-between rounded-card border border-surface bg-white p-4">
      <div>
        <p className="font-medium text-secondary">{document.name}</p>
        <p className="mt-1 text-sm text-muted">{document.type}</p>
        {document.related_lab_result_ids.length > 0 && (
          <p className="mt-1 text-xs text-muted">
            {t("linkedLabResults", { count: document.related_lab_result_ids.length })}
          </p>
        )}
      </div>
      <div className="flex items-center gap-4">
        {document.document_date && <p className="text-sm text-muted">{document.document_date}</p>}
        <DocumentViewLink documentId={document.id} />
        <ConfirmDialog
          trigger={(open) => (
            <button type="button" onClick={open} className="text-xs text-status-urgent hover:underline">
              {tCommon("delete")}
            </button>
          )}
          title={t("deleteConfirmTitle")}
          description={t("deleteConfirmMessage")}
          onConfirm={handleDelete}
        />
      </div>
    </div>
  );
}
