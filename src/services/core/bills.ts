import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { Bill, BillFrequency, FinanceTransaction } from "@/types/core/entities";
import { UserFacingError } from "@/lib/errors";

export async function listBills(): Promise<Bill[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("bills").select("*").order("due_date", { ascending: true });
  if (error) throw error;
  return data as Bill[];
}

export async function getBill(id: string): Promise<Bill | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("bills").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Bill | null;
}

export async function createBill(
  input: Pick<Bill, "name" | "amount" | "due_date"> & Partial<Omit<Bill, "id" | "user_id" | "name" | "amount" | "due_date" | "created_at" | "updated_at">>
): Promise<Bill> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("bills")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as Bill;
}

export async function updateBill(id: string, input: Partial<Omit<Bill, "id" | "user_id" | "created_at" | "updated_at">>): Promise<Bill> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("bills").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data as Bill;
}

export async function deleteBill(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("bills").delete().eq("id", id);
  if (error) throw error;
}

// Only frequencies with an unambiguous calendar interval auto-advance —
// "custom" has no captured interval value, so advancing it would be a
// guess. A custom-frequency recurring bill still gets marked paid, but
// the user sets its next due_date manually via Edit (same one-time-bill
// path below), rather than this function fabricating a cadence.
function computeNextDueDate(dueDate: string, frequency: BillFrequency): string | null {
  const date = new Date(`${dueDate}T00:00:00Z`);
  switch (frequency) {
    case "weekly":
      date.setUTCDate(date.getUTCDate() + 7);
      break;
    case "monthly":
      date.setUTCMonth(date.getUTCMonth() + 1);
      break;
    case "quarterly":
      date.setUTCMonth(date.getUTCMonth() + 3);
      break;
    case "yearly":
      date.setUTCFullYear(date.getUTCFullYear() + 1);
      break;
    case "custom":
      return null;
  }
  return date.toISOString().slice(0, 10);
}

// Bills spec, Section 22: "Mark as Paid" creates exactly one linked
// Expense and prevents duplicate creation. `linked_transaction_id`
// being already set is the one-time-bill guard (a paid one-time bill
// never accepts a second payment); a recurring bill's guard is
// structural instead — the moment it's paid its due_date advances and
// status resets to "pending" for the NEXT cycle, so the historical
// payment lives permanently only as the created finance_transactions
// row (bill_id-linked), never duplicated on the bill row itself.
export async function payBill(
  id: string,
  input: { paidDate?: string; amount?: number } = {}
): Promise<{ bill: Bill; transaction: FinanceTransaction }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) throw new UserFacingError("Not authenticated");

  const bill = await getBill(id);
  if (!bill) throw new UserFacingError("Bill not found");
  if (bill.status === "paid" && !bill.is_recurring) throw new UserFacingError("Bill is already paid");

  const paidDate = input.paidDate ?? new Date().toISOString().slice(0, 10);
  const amount = input.amount ?? bill.amount;
  const nextDueDate = bill.is_recurring && bill.frequency ? computeNextDueDate(bill.due_date, bill.frequency) : null;
  const advances = nextDueDate !== null;

  // Atomic guard against a double "Mark as Paid" (a double-click before
  // the button's own disabled state re-renders, two browser tabs, or a
  // retried request): the bill's status transition happens FIRST, and
  // only succeeds (`.eq("status", "pending")`) if it's still in the
  // exact state read above — a second concurrent call's UPDATE affects
  // zero rows and is rejected here, before it can ever reach the
  // Expense-creating insert below. Checking-then-acting in the other
  // order (insert first, update after) is exactly the TOCTOU race that
  // would let two concurrent calls both pass the check and both create
  // a duplicate Expense — this ordering closes that gap without needing
  // a DB-level advisory lock.
  const { data: claimedBill, error: claimError } = await supabase
    .from("bills")
    .update({
      status: advances ? "pending" : "paid",
      paid_at: advances ? null : new Date().toISOString(),
      due_date: advances ? nextDueDate : bill.due_date,
    })
    .eq("id", id)
    .eq("status", "pending")
    .select()
    .maybeSingle();
  if (claimError) throw claimError;
  if (!claimedBill) throw new UserFacingError("This bill was already paid.");

  const { data: transaction, error: txnError } = await supabase
    .from("finance_transactions")
    .insert({
      user_id: user.id,
      type: "expense",
      description: bill.name,
      amount,
      date: paidDate,
      category: bill.category ?? "other",
      payment_method: bill.payment_method ?? undefined,
      business_id: bill.business_id,
      bill_id: bill.id,
    })
    .select()
    .single();
  if (txnError) throw txnError;

  // One-time bills record the link back now that the transaction
  // exists; a recurring bill already rolled forward to "pending" above
  // and never stores a linked_transaction_id (Section 22: the row IS
  // the recurring template, never duplicated).
  let updatedBill = claimedBill as Bill;
  if (!advances) {
    const { data: linked, error: billError } = await supabase
      .from("bills")
      .update({ linked_transaction_id: transaction.id })
      .eq("id", id)
      .select()
      .single();
    if (billError) throw billError;
    updatedBill = linked as Bill;
  }

  return { bill: updatedBill as Bill, transaction: transaction as FinanceTransaction };
}
