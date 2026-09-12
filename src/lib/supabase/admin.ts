import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/core/database";

// Service-role Supabase client for background/cron contexts where there is
// no user session to read (no cookies — see src/lib/supabase/server.ts's
// createClient(), which needs next/headers' cookies() and therefore only
// works inside a real per-request render). This client authenticates as
// the Supabase project itself and BYPASSES ROW LEVEL SECURITY ENTIRELY, so
// every caller is responsible for its own scoping (e.g. filtering by an
// explicit user_id) rather than relying on RLS the way every other service
// function in this app does.
//
// Used by exactly one call path today: processDueRemindersGlobally()
// (src/services/core/reminders.ts), invoked from the cron route
// (src/app/api/cron/process-reminders/route.ts) — never import this from
// a "use client" file, and never let SUPABASE_SERVICE_ROLE_KEY reach the
// browser (it must never be NEXT_PUBLIC_-prefixed).
export function createAdminClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Admin Supabase client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
