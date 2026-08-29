"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

// Fetches a short-lived signed URL on click rather than embedding one
// in the page at render time (Spec Section 6.2: keep signed-URL exposure
// as brief as possible).
export function DocumentViewLink({ documentId }: { documentId: string }) {
  const t = useTranslations("documents");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleClick() {
    setLoading(true);
    setError(false);

    const response = await fetch(`/api/health/documents/${documentId}/signed-url`);
    setLoading(false);

    if (!response.ok) {
      setError(true);
      return;
    }

    const { url } = await response.json();
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="inline-flex min-h-11 items-center text-sm text-primary hover:underline disabled:opacity-50"
    >
      {error ? t("viewError") : loading ? t("loading") : t("view")}
    </button>
  );
}
