"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Share2 } from "lucide-react";

export function DuaShareButton({ title, text }: { title: string; text: string }) {
  const t = useTranslations("faith.dua");
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // User cancelled the share sheet — not an error worth surfacing.
      }
      return;
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button type="button" onClick={handleShare} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-secondary hover:text-primary">
      <Share2 size={16} />
      {copied ? t("linkCopied") : t("share")}
    </button>
  );
}
