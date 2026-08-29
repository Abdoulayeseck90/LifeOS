// Zero Supabase/next-headers imports on purpose — client components
// (document-card.tsx's expiration badge) import this directly rather
// than going through services/core/personal-documents.ts, avoiding the
// exact client/server-bundle-boundary bug fixed for Bills via
// src/lib/finance/bill-status.ts.
export function getDaysUntilExpiration(expirationDate: string, referenceDate: Date = new Date()): number {
  const today = new Date(`${referenceDate.toISOString().slice(0, 10)}T00:00:00Z`);
  const expiry = new Date(`${expirationDate}T00:00:00Z`);
  return Math.round((expiry.getTime() - today.getTime()) / 86_400_000);
}
