import { createClient } from "@/lib/supabase/server";
import type { DebtPayment } from "@/types/core/entities";

// Read-only from the app's perspective — every row here is created and
// maintained exclusively by the pay_bill()/update_paid_bill_amount()
// database functions (services/core/bills.ts), never inserted or
// updated directly, so there is no createDebtPayment/updateDebtPayment
// here to call by mistake.
export async function listDebtPaymentsForCreditCard(creditCardId: string): Promise<DebtPayment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("debt_payments")
    .select("*")
    .eq("credit_card_id", creditCardId)
    .order("paid_at", { ascending: false });
  if (error) throw error;
  return data as DebtPayment[];
}

export async function listDebtPaymentsForLoan(loanId: string): Promise<DebtPayment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("debt_payments").select("*").eq("loan_id", loanId).order("paid_at", { ascending: false });
  if (error) throw error;
  return data as DebtPayment[];
}

// Used by bills.ts to decide whether a bill is safe to delete, and by
// updateBill()/payBill() to find the existing row to upsert against.
export async function getDebtPaymentForBill(billId: string): Promise<DebtPayment | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("debt_payments").select("*").eq("bill_id", billId).maybeSingle();
  if (error) throw error;
  return data as DebtPayment | null;
}
