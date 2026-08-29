import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Fixed callback path Supabase's password-recovery email links straight
// to (configured as the resetPasswordForEmail redirectTo in the
// forgot-password page) — deliberately not locale-prefixed, same reason
// the API routes aren't. Exchanges the PKCE code server-side so the
// recovery session lands in an httpOnly-style cookie via the SSR client,
// exactly like every other session in this app, rather than leaving the
// browser client to race the exchange client-side on the reset-password
// page itself.
// Security audit finding: `next` used to be concatenated into the
// redirect target unvalidated (`${origin}${next}`). A value like
// "@evil.com" turns that into "http://yourapp.com@evil.com", which
// browsers parse as a redirect to evil.com (the origin becomes URL
// userinfo, not the host) — a real open redirect riding on a
// legitimate, freshly-authenticated password-recovery session. Only
// this route's own forgot-password page ever sets `next` (always
// "/{locale}/reset-password"), so requiring a single leading slash and
// rejecting a protocol-relative "//" prefix is sufficient and doesn't
// need a locale allow-list.
function isSafeRelativePath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\");
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next");
  const next = requestedNext && isSafeRelativePath(requestedNext) ? requestedNext : "/en/reset-password";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/en/login?error=invalid_reset_link`);
}
