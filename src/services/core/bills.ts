import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { Bill, BillFrequency, FinanceTransaction } from "@/types/core/entities";
import { UserFacingError } from "@/lib/errors";
import { getCreditCard, getLoan } from "@/services/core/credit-and-loans";
import { getDebtPaymentForBill } from "@/services/core/debt-payments";

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

// The linked_credit_card_id/linked_loan_id FK columns only guarantee
// "a row with this id exists somewhere in credit_cards/loans" — they
// say nothing about who owns it. Without this check a user could point
// their own bill at another user's card/loan id (a UUID they'd need to
// already know, but nothing in the schema itself prevents it). getX(id)
// is RLS-scoped, so it resolves to null for anything not owned by the
// caller — identical handling whether the id doesn't exist at all or
// belongs to someone else, so neither case leaks which one it was.
async function assertDebtLinkOwnership(input: { linked_credit_card_id?: string | null; linked_loan_id?: string | null }): Promise<void> {
  if (input.linked_credit_card_id) {
    const card = await getCreditCard(input.linked_credit_card_id);
    if (!card) throw new UserFacingError("Credit card not found");
  }
  if (input.linked_loan_id) {
    const loan = await getLoan(input.linked_loan_id);
    if (!loan) throw new UserFacingError("Loan not found");
  }
}

export async function createBill(
  input: Pick<Bill, "name" | "amount" | "due_date"> & Partial<Omit<Bill, "id" | "user_id" | "name" | "amount" | "due_date" | "created_at" | "updated_at">>
): Promise<Bill> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Not authenticated");

  await assertDebtLinkOwnership(input);

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

  await assertDebtLinkOwnership(input);

  // Editing the amount on a bill that's already paid AND debt-linked
  // must propagate to the existing debt_payments row and adjust the
  // balance by the delta ($500 -> $600 is a $100 adjustment, never a
  // second $600 payment) — routed through the same atomic RPC pay_bill
  // uses, for the same reason: the amount/debt_payments/balance writes
  // must succeed or fail together. An unpaid or non-debt-linked bill's
  // amount is just a plain field like any other, handled by the normal
  // update path below.
  if (input.amount !== undefined) {
    const current = await getBill(id);
    if (!current) throw new UserFacingError("Bill not found");

    if (current.status === "paid" && (current.linked_credit_card_id || current.linked_loan_id)) {
      const { amount, ...rest } = input;
      const { data: rpcData, error: rpcError } = await supabase.rpc("update_paid_bill_amount", {
        p_bill_id: id,
        p_new_amount: amount,
      });
      if (rpcError) {
        if (rpcError.message?.includes("DEBT_TARGET_NOT_FOUND")) {
          throw new UserFacingError("The linked credit card or loan could not be found.");
        }
        throw rpcError;
      }

      if (Object.keys(rest).length === 0) {
        return rpcData as Bill;
      }
      const { data, error } = await supabase.from("bills").update(rest).eq("id", id).select().single();
      if (error) throw error;
      return data as Bill;
    }
  }

  const { data, error } = await supabase.from("bills").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data as Bill;
}

// Deleting a bill that already has a recorded debt payment would either
// silently leave the credit card/loan balance permanently reduced for a
// payment whose bill no longer exists, or require guessing whether the
// user wants that reduction reversed — exactly the "unsafe partial
// reversal" the spec says not to implement. Blocked outright instead,
// same philosophy as unmark-paid not being supported: the user must
// explicitly deal with the debt payment first.
export async function deleteBill(id: string): Promise<void> {
  const supabase = await createClient();

  const existingPayment = await getDebtPaymentForBill(id);
  if (existingPayment) {
    throw new UserFacingError("This bill has a recorded debt payment and can't be deleted. Remove the payment from the linked credit card or loan first.");
  }

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
// Expense and prevents duplicate creation. A one-time bill is guarded
// by its status permanently becoming "paid" (a second call can never
// match the claim guard again). A recurring bill's status instead
// resets to "pending" for the next cycle, so status alone can't block a
// duplicate/retried call — pay_bill() additionally requires the
// due_date the caller last observed to still match (see
// p_expected_due_date above and 0047_fix_recurring_bill_idempotency.sql),
// so a stale retry fails once the real payment has already advanced it.
//
// When the bill is linked to a Credit Card or Loan, the same action
// must also apply the payment to that debt's balance and record it in
// debt_payments — and that has to happen atomically with the bill/
// expense writes above (Section "ATOMIC OPERATION": the bill must never
// end up "Paid" if the debt update failed). All of it — the bill claim,
// the expense insert, the debt_payments insert, and the balance
// adjustment — happens inside one database transaction via the pay_bill
// function (0045_bill_debt_linking.sql, fixed by 0046/0047), not as
// separate round-trips
// from here that could fail partway through.
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

  const { data, error } = await supabase.rpc("pay_bill", {
    p_bill_id: id,
    // Recurring bills reset status back to 'pending' as part of being
    // paid (so the next cycle shows up as due) — the claim guard can't
    // rely on status alone to block a duplicate/retried call the way it
    // does for a one-time bill. Passing the due_date this call actually
    // observed lets pay_bill() do a compare-and-swap: once a payment
    // succeeds and due_date advances, a stale duplicate call's guard
    // fails and it's correctly rejected as ALREADY_PAID instead of
    // recording a second expense for the same due date.
    p_expected_due_date: bill.due_date,
    p_new_status: advances ? "pending" : "paid",
    p_new_paid_at: advances ? null : new Date().toISOString(),
    p_new_due_date: advances ? nextDueDate : bill.due_date,
    p_expense_description: bill.name,
    p_expense_amount: amount,
    p_expense_date: paidDate,
    p_expense_category: bill.category ?? "other",
    p_expense_payment_method: bill.payment_method,
    p_expense_business_id: bill.business_id,
    p_link_transaction: !advances,
  });

  if (error) {
    // pay_bill raises a plain string via RAISE EXCEPTION — Postgres
    // wraps it as error.message. ALREADY_PAID is the same double-click/
    // retry/two-tabs race the previous claim-first UPDATE guarded
    // against; DEBT_TARGET_NOT_FOUND means the linked card/loan no
    // longer belongs to this user (or was deleted) by the time payment
    // was attempted. Both are safe, expected domain errors — everything
    // else (a real Postgres/constraint error) falls through to the
    // route's generic message, never reaching the client verbatim.
    if (error.message?.includes("ALREADY_PAID")) {
      throw new UserFacingError("This bill was already paid.");
    }
    if (error.message?.includes("DEBT_TARGET_NOT_FOUND")) {
      throw new UserFacingError("The linked credit card or loan could not be found.");
    }
    console.error("pay_bill RPC error:", error);
    throw error;
  }

  const result = data as { bill: Bill; transaction: FinanceTransaction };
  return { bill: result.bill, transaction: result.transaction };
}
