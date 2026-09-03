"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/core/modal";
import type { RecurrenceEditScope } from "@/types/health/entities";

// Calendar spec: editing/deleting a recurring appointment must ask
// which occurrences the action applies to. Three direct action buttons
// rather than a radio-then-confirm flow — one click both picks the
// scope and runs it, the same shape most calendar apps use for this
// exact prompt. Only ever shown for a recurring occurrence; a plain
// one-time appointment's edit/delete skips this entirely.
export function RecurrenceScopeDialog({
  open,
  onOpenChange,
  title,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onConfirm: (scope: RecurrenceEditScope) => Promise<void> | void;
}) {
  const t = useTranslations("calendar.recurrenceScope");
  const tCommon = useTranslations("common");
  const [submitting, setSubmitting] = useState<RecurrenceEditScope | null>(null);

  async function handleChoose(scope: RecurrenceEditScope) {
    setSubmitting(scope);
    await onConfirm(scope);
    setSubmitting(null);
    onOpenChange(false);
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title}>
      <div className="flex flex-col gap-2">
        {(["this", "following", "series"] as const).map((scope) => (
          <button
            key={scope}
            type="button"
            onClick={() => handleChoose(scope)}
            disabled={submitting !== null}
            className="min-h-11 rounded border border-surface px-4 py-3 text-left text-sm text-secondary hover:bg-surface disabled:opacity-50"
          >
            {t(scope)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          disabled={submitting !== null}
          className="mt-2 min-h-11 rounded px-4 text-sm text-muted hover:bg-surface"
        >
          {tCommon("cancel")}
        </button>
      </div>
    </Modal>
  );
}
