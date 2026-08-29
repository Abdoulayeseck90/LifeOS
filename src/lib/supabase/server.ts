import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/core/database";

// Server-side Supabase client for Server Components, Route Handlers,
// and Server Actions. Cookie-based session so RLS auth.uid() resolves
// correctly on every request — this is the client every API route
// under src/app/api must use, never the anon browser client.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component that can't set cookies —
            // safe to ignore if middleware.ts is refreshing sessions.
          }
        },
      },
      // Security audit: @supabase/ssr's DEFAULT_COOKIE_OPTIONS doesn't set
      // `secure` at all, so it's left up to the deployment. Explicit here
      // rather than implicit — false only in local http:// dev.
      cookieOptions: { secure: process.env.NODE_ENV === "production" },
    }
  );
}
