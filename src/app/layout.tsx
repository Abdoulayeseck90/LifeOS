import type { Metadata, Viewport } from "next";
import "./globals.css";

// PWA/Web Push spec: web app manifest + installable icons + iOS's own
// (non-standard) apple-mobile-web-app-* meta tags — Safari on iOS
// doesn't read manifest.json for its Home Screen install metadata the
// way other browsers do, so both are needed for the same result across
// browsers (Spec Section 4/5). Uses the existing LifeOS icon assets —
// no new logo.
export const metadata: Metadata = {
  title: "LifeOS",
  description: "Personal operating system for health, planning, and life management.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/app-icon-dark.svg",
    apple: "/icons/app-icon-512.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LifeOS",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F172A",
};

// No <html>/<body> here — every route lives under [locale], and that
// segment's own layout renders them with the correct lang attribute
// (Section 24: this was previously hardcoded to lang="en" even when
// viewing /fr/*, since this outer layout sits above the [locale]
// segment and never had access to the active locale). Metadata/viewport
// exports here still apply to the whole app; Next.js merges them with
// whatever the [locale] layout/pages export.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
