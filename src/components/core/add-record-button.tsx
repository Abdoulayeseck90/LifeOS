"use client";

import type { ReactNode } from "react";
import { RecordFormModal, type RecordFormRenderProps } from "@/components/core/record-form-modal";

// Thin convenience wrapper around RecordFormModal for the common "+ Add
// X" primary-action case (Section 2) — styled per the LifeOS design
// tokens (bg-primary/rounded), never a one-off button style.
export function AddRecordButton({
  label,
  modalTitle,
  variant = "modal",
  children,
}: {
  label: string;
  modalTitle: string;
  variant?: "modal" | "drawer";
  children: (props: RecordFormRenderProps) => ReactNode;
}) {
  return (
    <RecordFormModal
      trigger={(open) => (
        <button
          type="button"
          onClick={open}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          + {label}
        </button>
      )}
      modalTitle={modalTitle}
      variant={variant}
    >
      {children}
    </RecordFormModal>
  );
}
