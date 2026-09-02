import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/core/header";
import { AppSidebar } from "@/components/core/app-sidebar";
import { OfflineSyncInit } from "@/components/core/offline-sync-init";
import { LoadingState } from "@/components/core/loading-state";
import { processDueReminders } from "@/services/core/reminders";

// Auth gate for every authenticated route (dashboard, health/*, settings).
// Never rely on RLS alone to keep an unauthenticated visitor off these
// pages — fail fast with a redirect per Spec Section 30, same principle
// as the 401 checks in the API routes.
//
// Startup-flash fix: the auth check + Header's own data fetches are a
// real network round trip with nothing to show for it. loading.tsx only
// wraps this segment's *page*, not this layout, so without a Suspense
// boundary here the browser sits on a blank painted body for that whole
// round trip before anything else can stream in. Wrapping the
// auth-gated shell in its own Suspense (same LoadingState used by
// (app)/loading.tsx) paints an app-styled spinner immediately instead —
// the redirect and all protected rendering below still fully happen
// before any of it reaches the client, nothing is weakened.
export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("common");

  return (
    <Suspense fallback={<LoadingState label={t("loading")} />}>
      <AuthenticatedShell locale={locale}>{children}</AuthenticatedShell>
    </Suspense>
  );
}

async function AuthenticatedShell({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: string;
}) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Interim substitute for a real scheduled trigger — see the comment
  // on processDueReminders() in services/core/reminders.ts. Runs on
  // every authenticated page load; a no-op query when nothing is due.
  // Still awaited (not fire-and-forget): on a serverless deployment an
  // un-awaited background promise can be killed the moment the response
  // finishes streaming, which would make reminders silently stop firing
  // — a functional regression, not an acceptable trade for a visual fix.
  // The Suspense boundary above is what actually fixes the blank-flash
  // problem (something paints immediately regardless of how long this
  // takes); this only still needs its own error containment so a
  // failure here can't take down the whole authenticated shell.
  try {
    await processDueReminders();
  } catch (err) {
    console.error("[reminders] processDueReminders failed (page render continues):", err);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <OfflineSyncInit />
      <Header />
      <div className="flex flex-1">
        <AppSidebar />
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
