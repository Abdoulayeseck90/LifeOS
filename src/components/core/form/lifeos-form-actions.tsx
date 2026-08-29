"use client";

import { useTranslations } from "next-intl";

// Form Redesign spec, Section 16: the one shared Cancel/Save button
// row — clear text, comfortable height, visible border/background,
// disabled + loading (via `submitting`) states. Buttons default to
// type="button"/"submit" so this drops straight into any <form>.
export function LifeOSFormActions({
  onCancel,
  submitting,
  submitLabel,
  cancelLabel,
}: {
  onCancel: () => void;
  submitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
}) {
  const t = useTranslations("common");

  return (
    <div className="mt-2 flex justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="min-h-11 rounded border border-slate-300 px-4 py-2 text-sm font-medium text-secondary hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        {cancelLabel ?? t("cancel")}
      </button>
      <button
        type="submit"
        disabled={submitting}
        className="min-h-11 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
      >
        {submitting ? t("loading") : (submitLabel ?? t("save"))}
      </button>
    </div>
  );
}
