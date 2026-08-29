"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Check } from "lucide-react";

// Section 5/23: Arabic must be visually prominent, highly readable, and
// properly RTL — the one place in the app using dir="rtl" (nothing else
// does yet). Renders nothing when there's no Arabic text (Section 7:
// personal Duas never require it).
export function DuaArabicBlock({ text }: { text: string | null }) {
  const t = useTranslations("faith.dua");
  const [copied, setCopied] = useState(false);

  if (!text) return null;

  async function handleCopy() {
    await navigator.clipboard.writeText(text as string);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-card border border-surface bg-surface/40 p-4">
      <p dir="rtl" lang="ar" className="text-right text-2xl leading-loose text-secondary sm:text-3xl">
        {text}
      </p>
      <button
        type="button"
        onClick={handleCopy}
        className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-xs text-primary hover:underline"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? t("copied") : t("copyText")}
      </button>
    </div>
  );
}
