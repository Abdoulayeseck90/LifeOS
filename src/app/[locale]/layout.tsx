import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales, type Locale } from "@/lib/i18n/config";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// No Sidebar/shell here — (app) and (auth) route groups each define
// their own, since auth pages must not show the health nav.
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        {/* LifeOS is light-only (no dark/system theme exists to switch
            to). Without this, a browser whose OS is set to dark mode
            paints its own default dark background for the brief window
            before globals.css finishes loading — a black flash the app
            never intended, since it has no dark theme at all. The meta
            tag is read during HTML parsing, before any external
            stylesheet, which is what actually closes that gap. */}
        <meta name="color-scheme" content="light" />
      </head>
      <body className="bg-background text-secondary" style={{ backgroundColor: "#FFFFFF" }}>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
