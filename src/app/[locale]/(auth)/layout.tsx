import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { Logo } from "@/components/core/logo";

// Minimal shell for login/signup — no Sidebar, since an unauthenticated
// visitor has no health nav to show. Already-authenticated visitors are
// bounced to the dashboard rather than shown the login form again.
//
// A prior attempt to close the startup-flash gap moved `children` into a
// separate async component wrapped in a manually-added <Suspense> — see
// the comment in (app)/layout.tsx for why that broke Dashboard on a cold
// page load (Next.js wires a layout's `children` prop directly into that
// segment's own routing/Suspense machinery; relocating it breaks that on
// the initial SSR pass). Reverted here too, since this layout had the
// identical structure and the identical risk, even though it hadn't yet
// been reported broken.
export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
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
