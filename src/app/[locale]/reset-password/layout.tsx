import { Logo } from "@/components/core/logo";

// Same centered-card shell as (auth)/layout.tsx, deliberately not reused
// directly: that layout redirects any authenticated visitor straight to
// /dashboard, but landing here after clicking a password-recovery email
// link means a real (recovery) session already exists by design — this
// page must render for exactly that case, not bounce it away.
export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
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
