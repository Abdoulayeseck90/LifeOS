"use client";

import { useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/core/modal";

export type RecordFormRenderProps = {
  // Call after a successful save — closes without the unsaved-changes
  // prompt (the data is already saved, there's nothing to lose).
  closeAfterSave: () => void;
  // Call from the form's own Cancel button — runs the unsaved-changes
  // check first (Section 5).
  requestClose: () => void;
  // Call on every field change so ESC/click-outside/Cancel know whether
  // there's anything to lose. A cheap `useEffect` diffing form state
  // against its initial values is the usual way to drive this.
  registerDirty: (dirty: boolean) => void;
};

// Generic trigger+modal wrapper used for both "Add X" and "Edit X"
// (Global Data-Entry UX Refactor, Section 18) — the trigger UI is fully
// caller-controlled via render prop so the same component serves a
// primary "+ Add Appointment" button and a small inline "Edit" link.
export function RecordFormModal({
  trigger,
  modalTitle,
  variant = "modal",
  children,
}: {
  trigger: (open: () => void) => ReactNode;
  modalTitle: string;
  variant?: "modal" | "drawer";
  children: (props: RecordFormRenderProps) => ReactNode;
}) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const isDirtyRef = useRef(false);

  function confirmDiscardIfDirty(): boolean {
    if (!isDirtyRef.current) return true;
    return window.confirm(t("unsavedChangesWarning"));
  }

  function closeAfterSave() {
    isDirtyRef.current = false;
    setOpen(false);
  }

  function requestClose() {
    if (confirmDiscardIfDirty()) {
      isDirtyRef.current = false;
      setOpen(false);
    }
  }

  function handleOpenChange(next: boolean) {
    if (next) {
      setOpen(true);
      return;
    }
    requestClose();
  }

  return (
    <>
      {trigger(() => setOpen(true))}
      <Modal
        open={open}
        onOpenChange={handleOpenChange}
        title={modalTitle}
        variant={variant}
        onEscapeAttempt={confirmDiscardIfDirty}
        onOutsideAttempt={confirmDiscardIfDirty}
      >
        {children({
          closeAfterSave,
          requestClose,
          registerDirty: (dirty) => {
            isDirtyRef.current = dirty;
          },
        })}
      </Modal>
    </>
  );
}
