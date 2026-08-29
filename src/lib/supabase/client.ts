import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/core/database";

// Client-side Supabase client. Safe to use in Client Components.
// Relies on RLS for every table — never trust the client to filter by
// user_id; the database policy is the actual security boundary.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
