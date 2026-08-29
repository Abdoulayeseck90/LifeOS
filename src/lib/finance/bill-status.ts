import type { Bill } from "@/types/core/entities";

// pending/paid/cancelled are the only stored states (Bill type comment);
// overdue/due_today/upcoming are computed here from due_date vs today,
// same derived-status pattern as getMonitoringItemDisplayStatus in
// services/health/monitoring.ts — never stored redundantly. Kept in a
// module with zero Supabase/next-headers imports (unlike
// services/core/bills.ts) so client components (bill-status-badge.tsx)
// can import it without pulling a server-only module into the client
// bundle.
export type BillDisplayStatus = "paid" | "cancelled" | "overdue" | "due_today" | "upcoming";

export function getBillDisplayStatus(bill: Pick<Bill, "status" | "due_date">, referenceDate: Date = new Date()): BillDisplayStatus {
  if (bill.status !== "pending") return bill.status;
  const today = referenceDate.toISOString().slice(0, 10);
  if (bill.due_date < today) return "overdue";
  if (bill.due_date === today) return "due_today";
  return "upcoming";
}
