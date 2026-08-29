"use client";

import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { ConfirmDialog } from "@/components/core/confirm-dialog";
import { clearOfflineData } from "@/lib/offline/db";

// Shared by both the Settings "Account Actions" button and the header
// AccountMenu's Sign Out item — one implementation of the actual
// sign-out call, reused via the hook below.
export function useSignOut() {
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();

  return async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Security audit finding: without this, a second user signing in on
    // the same shared browser would see the previous user's cached
    // offline Notes/Tasks/Dua data until it happened to get overwritten.
    // Best-effort — a clear failure must never block sign-out itself.
    try {
      await clearOfflineData();
    } catch (err) {
      console.error("[offline] Failed to clear offline cache on sign-out:", err instanceof Error ? err.message : String(err));
    }
    router.push(`/${locale}/login`);
    router.refresh();
  };
}

// Master Redesign Section 13: Sign Out must always confirm first. Used
// standalone in Settings; account-menu.tsx reuses the same ConfirmDialog
// pattern with a DropdownMenu.Item as the trigger instead.
export function SignOutButton({
  trigger,
}: {
  trigger?: (open: () => void) => ReactNode;
}) {
  const t = useTranslations("auth");
  const signOut = useSignOut();

  return (
    <ConfirmDialog
      trigger={
        trigger ??
        ((open) => (
          <button
            type="button"
            onClick={open}
            className="rounded border border-status-urgent px-4 py-2 text-sm font-medium text-status-urgent hover:bg-status-urgent/5"
          >
            {t("signOut")}
          </button>
        ))
      }
      title={t("signOutConfirmTitle")}
      description={t("signOutConfirmMessage")}
      onConfirm={signOut}
      confirmLabel={t("signOut")}
    />
  );
}
