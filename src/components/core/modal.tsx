"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import type { ReactNode } from "react";

// Shared modal/drawer primitive for every create/edit/detail surface in
// the app (Global Data-Entry UX Refactor, Section 18: "avoid duplicating
// modal/form logic across every page"). Built on Radix Dialog rather
// than hand-rolled — it's the same accessible primitive shadcn/ui uses
// (the spec's stated UI stack), giving focus trap, focus-return-to-
// trigger, ESC-to-close, and proper dialog semantics for free (Section
// 21) without a heavier shadcn CLI scaffold this codebase doesn't have
// yet. `variant="drawer"` slides in from the right for forms with more
// fields; both variants go full-screen below the sm breakpoint
// (Section 19) using only existing Tailwind tokens — no new colors,
// borders, or animation config added to tailwind.config.ts.
export function Modal({
  open,
  onOpenChange,
  title,
  variant = "modal",
  side = "right",
  onEscapeAttempt,
  onOutsideAttempt,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  variant?: "modal" | "drawer";
  // Which edge a drawer slides from — "left" for nav-style drawers
  // (MobileSidebarDrawer), "right" (default) for every existing
  // create/edit form drawer, unchanged.
  side?: "left" | "right";
  // Return false to block the close (e.g. unsaved changes) — used for
  // the ESC key and click-outside dismiss paths specifically, since the
  // form's own Cancel button already runs its own confirmation before
  // calling onOpenChange(false) directly.
  onEscapeAttempt?: () => boolean;
  onOutsideAttempt?: () => boolean;
  children: ReactNode;
}) {
  const t = useTranslations("common");
  const drawerSideClasses =
    side === "left" ? "left-0 sm:rounded-r-card" : "right-0 sm:rounded-l-card";
  const contentClasses =
    variant === "drawer"
      ? `fixed inset-y-0 z-50 h-full w-full overflow-y-auto bg-white p-6 shadow-lg sm:max-w-md ${drawerSideClasses}`
      : "fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full -translate-x-1/2 -translate-y-1/2 overflow-y-auto bg-white p-6 shadow-lg max-sm:inset-0 max-sm:h-full max-sm:max-h-none max-sm:translate-x-0 max-sm:translate-y-0 sm:max-w-lg sm:rounded-card";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-secondary/40" />
        <Dialog.Content
          className={contentClasses}
          onEscapeKeyDown={(event) => {
            if (onEscapeAttempt && !onEscapeAttempt()) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (onOutsideAttempt && !onOutsideAttempt()) event.preventDefault();
          }}
        >
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-secondary">{title}</Dialog.Title>
            <Dialog.Close
              className="rounded px-2 py-1 text-muted hover:bg-surface hover:text-primary"
              aria-label={t("close")}
            >
              <X size={18} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
