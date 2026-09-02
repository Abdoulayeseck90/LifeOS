import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { Logo } from "@/components/core/logo";

// Minimal shell for login/signup — no Sidebar, since an unauthenticated
// visitor has no health nav to show. Already-authenticated visitors are
// bounced to the dashboard rather than shown the login form again.
//
// Same startup-flash fix as (app)/layout.tsx: the already-authenticated
// check below is a network round trip with nothing rendered while it's
// in flight. A background matching the eventual card (bg-surface, same
// as the real shell) as the Suspense fallback keeps that gap from
// reading as an unstyled flash, without needing a spinner for what's
// normally a near-instant check.
export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <Suspense fallback={<div className="min-h-screen bg-surface" />}>
      <AuthGate locale={locale}>{children}</AuthGate>
    </Suspense>
  );
}

async function AuthGate({ children, locale }: { children: React.ReactNode; locale: string }) {
  const user = await getAuthenticatedUser();

  if (user) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-8">
      <div className="w-full max-w-sm rounded-card border border-surface bg-white p-8">
        <div className="mb-6 flex justify-center">
          <Logo size={36} withWordmark />
        </div>
        {children}
      </div>
    </div>
  );
}
