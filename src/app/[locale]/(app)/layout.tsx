import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { Header } from "@/components/core/header";
import { AppSidebar } from "@/components/core/app-sidebar";
import { OfflineSyncInit } from "@/components/core/offline-sync-init";
import { processDueReminders } from "@/services/core/reminders";

// Auth gate for every authenticated route (dashboard, health/*, settings).
// Never rely on RLS alone to keep an unauthenticated visitor off these
// pages — fail fast with a redirect per Spec Section 30, same principle
// as the 401 checks in the API routes.
//
// A prior attempt to close the startup-flash gap moved `children` out of
// this exported function and into a separate async component wrapped in
// a manually-added <Suspense>. That broke Dashboard specifically on a
// full/cold page load (worked fine again after any client-side
// navigation) — Next.js's App Router wires the `children` prop passed to
// a layout's default export directly into that segment's own routing/
// Suspense machinery (what lets loading.tsx auto-wrap it); relocating
// `children` one level deeper breaks that wiring on the initial SSR
// pass, but not on a client-side route swap, which never remounts this
// layout at all. Reverted back to rendering `children` directly here.
// The color-scheme meta tag in [locale]/layout.tsx (a separate, safe
// fix) still stands on its own for the black-flash issue.
export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Interim substitute for a real scheduled trigger — see the comment
  // on processDueReminders() in services/core/reminders.ts. Runs on
  // every authenticated page load; a no-op query when nothing is due.
  // Never let this best-effort background side effect take the whole
  // app down: it runs in the layout itself (not a page), so a thrown
  // error here bypasses this segment's own error.tsx boundary entirely
  // and would otherwise surface as a hard, unrecoverable server crash on
  // every single authenticated route — e.g. if the database schema is
  // temporarily out of sync with the code (see the reminders schema
  // migration notes). Log it for real diagnosis, but always render the
  // page the user actually asked for.
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
