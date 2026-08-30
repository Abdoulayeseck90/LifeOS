import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { isAuthSessionMissingError, type User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache as reactCache } from "react";
import type { Database } from "@/types/core/database";

// React's cache() is only resolvable under the "react-server" module
// condition, which Next.js's own build/dev process sets when bundling
// server-only code — it isn't part of the plain `react` package Node
// resolves outside that (e.g. Vitest, or any other non-Next runtime),
// where the named import silently comes back undefined rather than
// throwing at import time. Falling back to a no-op passthrough (call the
// function directly, no memoization) keeps this module safe to import
// from anywhere; the per-request dedup this exists for only ever mattered
// inside real Next.js Server Component rendering anyway.
const cache: typeof reactCache = typeof reactCache === "function" ? reactCache : (((fn: unknown) => fn) as typeof reactCache);

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

// auth.getUser() always makes a live network round-trip to Supabase's
// Auth server to re-verify the JWT (deliberately never trusts a locally
// decoded session, to guard against forged/stale local data) — it is
// never cached by the Supabase client itself. Before this helper, ~200
// call sites across the app each made their own independent getUser()
// call, so a single page load (e.g. the dashboard's Promise.all of many
// parallel service calls) could fire a dozen-plus separate network
// round-trips to Supabase Auth for the exact same request — and a single
// transient blip to Supabase on any one of them produced a false "Not
// authenticated" even though the session was completely valid. React's
// cache() memoizes this per request (within one Server Component render
// pass), so every caller within the same request shares one real network
// call. Not usable in middleware.ts, which runs outside the React render
// pass entirely and needs its own direct call for the token-refresh side
// effect anyway.
export const getAuthenticatedUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const first = await supabase.auth.getUser();
  if (!first.error) return first.data.user;

  // Supabase's own AuthSessionMissingError ("Auth session missing!") is
  // not a failure at all — it's how getUser() reports "there is no
  // session cookie," which is the completely normal state for e.g. every
  // visit to the (auth) layout's own getAuthenticatedUser() call while
  // logged out. Retrying that changes nothing (a second call a
  // millisecond later still has no cookie) and logging it as an error
  // would cry wolf on every ordinary logged-out page view. Only a real
  // error here — a transient network blip talking to Supabase's Auth
  // server — is worth one immediate retry before giving up.
  if (isAuthSessionMissingError(first.error)) return null;

  console.error("[auth] getUser() failed, retrying once:", first.error.message);
  const retry = await supabase.auth.getUser();
  if (retry.error && !isAuthSessionMissingError(retry.error)) {
    console.error("[auth] getUser() failed again on retry:", retry.error.message);
  }
  return retry.data.user;
});
