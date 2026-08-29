"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

// Generic destructive-action confirmation (Section 8, Section 18's
// "DeleteConfirmation"). Uses Radix AlertDialog rather than the regular
// Modal/Dialog — alertdialog is the semantically distinct ARIA role for
// "this needs an explicit decision," which is exactly Section 21's
// "proper dialog semantics" requirement for a delete prompt.
export function ConfirmDialog({
  trigger,
  title,
  description,
  onConfirm,
  confirmLabel,
}: {
  trigger: (open: () => void) => ReactNode;
  title: string;
  description: string;
  onConfirm: () => Promise<void> | void;
  confirmLabel?: string;
}) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    await onConfirm();
    setSubmitting(false);
    setOpen(false);
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      {trigger(() => setOpen(true))}
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-secondary/40" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-card bg-white p-6 shadow-lg">
          <AlertDialog.Title className="text-lg font-semibold text-secondary">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-muted">{description}</AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <button type="button" className="rounded border border-surface px-4 py-2 text-sm text-secondary">
                {t("cancel")}
              </button>
            </AlertDialog.Cancel>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className="rounded bg-status-urgent px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {confirmLabel ?? t("delete")}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
