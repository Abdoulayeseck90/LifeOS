import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { Subscription, SubscriptionBillingFrequency, FinanceTransaction } from "@/types/core/entities";
import { UserFacingError } from "@/lib/errors";

export async function listSubscriptions(): Promise<Subscription[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("subscriptions").select("*").order("next_billing_date", { ascending: true });
  if (error) throw error;
  return data as Subscription[];
}

export async function getSubscription(id: string): Promise<Subscription | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("subscriptions").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Subscription | null;
}

export async function createSubscription(
  input: Pick<Subscription, "name" | "amount" | "billing_frequency" | "next_billing_date"> &
    Partial<Omit<Subscription, "id" | "user_id" | "name" | "amount" | "billing_frequency" | "next_billing_date" | "created_at" | "updated_at">>
): Promise<Subscription> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("subscriptions")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as Subscription;
}

export async function updateSubscription(
  id: string,
  input: Partial<Omit<Subscription, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<Subscription> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("subscriptions").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data as Subscription;
}

export async function deleteSubscription(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("subscriptions").delete().eq("id", id);
  if (error) throw error;
}

function computeNextBillingDate(currentDate: string, frequency: SubscriptionBillingFrequency): string {
  const date = new Date(`${currentDate}T00:00:00Z`);
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
  }
  return date.toISOString().slice(0, 10);
}

// Subscriptions spec, Section 29: "Record Charge" is Subscriptions'
// equivalent of Bills' "Mark as Paid" — creates exactly one linked
// Expense per cycle and advances next_billing_date. Unlike payBill,
// there is no duplicate-payment guard to enforce here: a subscription
// legitimately produces a new, separate Expense every time it's
// charged, so calling this again for a later cycle is the intended
// use, not a bug to prevent.
export async function recordSubscriptionCharge(
  id: string,
  input: { chargeDate?: string; amount?: number } = {}
): Promise<{ subscription: Subscription; transaction: FinanceTransaction }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) throw new UserFacingError("Not authenticated");

  const subscription = await getSubscription(id);
  if (!subscription) throw new UserFacingError("Subscription not found");

  const chargeDate = input.chargeDate ?? new Date().toISOString().slice(0, 10);
  const amount = input.amount ?? subscription.amount;

  // Same atomic-guard-first ordering as payBill (services/core/bills.ts)
  // and the same reason: a rapid double-click on "Record Charge" before
  // the button's disabled state re-renders must not create two Expense
  // rows for the same click. Advancing next_billing_date FIRST, gated
  // on it still matching what was just read, means a second concurrent
  // call's UPDATE affects zero rows and is rejected before it can reach
  // the Expense-creating insert — a genuinely new charge later (after
  // next_billing_date has actually moved and the caller re-fetched) is
  // unaffected and still works exactly as intended.
  const { data: claimedSubscription, error: claimError } = await supabase
    .from("subscriptions")
    .update({ next_billing_date: computeNextBillingDate(subscription.next_billing_date, subscription.billing_frequency) })
    .eq("id", id)
    .eq("next_billing_date", subscription.next_billing_date)
    .select()
    .maybeSingle();
  if (claimError) throw claimError;
  if (!claimedSubscription) throw new UserFacingError("This subscription's charge was already recorded.");

  const { data: transaction, error: txnError } = await supabase
    .from("finance_transactions")
    .insert({
      user_id: user.id,
      type: "expense",
      description: subscription.name,
      amount,
      date: chargeDate,
      category: subscription.category ?? "other",
      payment_method: subscription.payment_method ?? undefined,
      subscription_id: subscription.id,
    })
    .select()
    .single();
  if (txnError) throw txnError;

  return { subscription: claimedSubscription as Subscription, transaction: transaction as FinanceTransaction };
}
