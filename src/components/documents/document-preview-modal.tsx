"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/core/modal";

// Section 73: "Do not force users to download a file just to see it" —
// images and PDFs preview inline; other types fall back to a plain
// download link. Fetches the signed URL only once the modal is actually
// open (not at render time), same lazy pattern as document-view-link.tsx
// (Section 6.2).
//
// Shared between Personal Documents and Medical Documents — nothing in
// here reads a Personal-Document-specific field, only the generic
// id/name/mimeType any document type already has. signedUrlEndpoint
// defaults to Personal Documents' own route so its existing caller
// doesn't need to change; Medical Documents passes its own path.
export function DocumentPreviewModal({
  documentId,
  name,
  mimeType,
  open,
  onOpenChange,
  signedUrlEndpoint,
}: {
  documentId: string;
  name: string;
  mimeType: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signedUrlEndpoint?: string;
}) {
  const t = useTranslations("personalDocuments");
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setUrl(null);
      setError(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch(signedUrlEndpoint ?? `/api/documents/${documentId}/signed-url`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("failed"))))
      .then((body) => {
        if (!cancelled) setUrl(body.url);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, documentId, signedUrlEndpoint]);

  const isImage = mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf";

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={name}>
      {loading ? (
        <p className="py-8 text-center text-sm text-muted">{t("loading")}</p>
      ) : error || !url ? (
        <p className="py-8 text-center text-sm text-status-urgent">{t("viewError")}</p>
      ) : isImage ? (
        <img src={url} alt={name} className="max-h-[70vh] w-full rounded object-contain" />
      ) : isPdf ? (
        <iframe src={url} title={name} className="h-[70vh] w-full rounded border border-surface" />
      ) : (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
          {t("downloadInstead")}
        </a>
      )}
    </Modal>
  );
}
