import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { locales, defaultLocale } from "@/lib/i18n/config";

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
});

// Session policy per Spec Section 6.2 (Threat Model): short-lived access
// tokens with refresh-token rotation, refreshed on every request here.
// Supabase Auth handles rotation; this middleware just keeps the cookie
// current so a stale/expired session is caught before it reaches a page.
export async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }: { name: string; value: string }) =>
            request.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: CookieOptions }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
      // Security audit: matches the same explicit `secure` override in
      // src/lib/supabase/server.ts — see the comment there.
      cookieOptions: { secure: process.env.NODE_ENV === "production" },
    }
  );

  // Touching getUser() refreshes the session token if needed.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // manifest.json/sw.js/offline.html (all new with the PWA/Push/Offline
    // work) are root-level public static files, same as the icon
    // extensions already excluded here — without this, next-intl's
    // middleware treats them as a localeless path and rewrites them under
    // /en/, /fr/, etc., 404ing since the real files only exist at the
    // actual root. auth/confirm is excluded for the same reason as api —
    // it's the Supabase password-recovery-link callback, a fixed path
    // Supabase's email template redirects straight to; it must never be
    // locale-rewritten since Supabase doesn't know about locales.
    "/((?!api|auth/confirm|_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|offline\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
