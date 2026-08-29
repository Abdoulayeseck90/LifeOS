import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/core/header";
import { AppSidebar } from "@/components/core/app-sidebar";
import { OfflineSyncInit } from "@/components/core/offline-sync-init";
import { processDueReminders } from "@/services/core/reminders";

// Auth gate for every authenticated route (dashboard, health/*, settings).
// Never rely on RLS alone to keep an unauthenticated visitor off these
// pages — fail fast with a redirect per Spec Section 30, same principle
// as the 401 checks in the API routes.
export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
