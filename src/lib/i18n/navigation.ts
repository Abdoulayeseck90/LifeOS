import { createNavigation } from "next-intl/navigation";
import { locales, defaultLocale } from "./config";

// Root cause of the platform-wide French bug: every internal link/
// programmatic navigation in the app was built with plain next/link
// and next/navigation — hrefs like "/dashboard" carry no locale
// segment at all. That only ever resolved correctly by accident, via
// next-intl's middleware re-deriving a locale from the NEXT_LOCALE
// cookie (or, absent one, the browser's Accept-Language header) and
// issuing a redirect back to a prefixed URL — an extra round trip on
// every single navigation, and one with no guarantee it lands back on
// the locale the user was just looking at. There was also no actual
// language switcher anywhere in the UI to ever set that cookie to
// "fr" in the first place (Settings' language field only wrote to the
// database — see profile-form.tsx — and nothing ever read it back to
// drive routing).
//
// This module is the fix: a locale-aware Link/useRouter/usePathname/
// redirect, generated from the same `locales`/`defaultLocale` the
// middleware and request config already use, so every in-app
// navigation carries the CURRENT locale explicitly and instantly, no
// redirect, no cookie race. Use these instead of next/link and
// next/navigation for any href/route that points inside the app.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation({
  locales,
  defaultLocale,
});
