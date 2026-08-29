import { createClient } from "@/lib/supabase/server";
import type { CreditCard, Loan } from "@/types/core/entities";

export async function listCreditCards(): Promise<CreditCard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("credit_cards").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as CreditCard[];
}

export async function createCreditCard(
  input: Pick<CreditCard, "name" | "balance" | "credit_limit" | "apr"> &
    Partial<Omit<CreditCard, "id" | "user_id" | "name" | "balance" | "credit_limit" | "apr" | "created_at" | "updated_at">>
): Promise<CreditCard> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("credit_cards")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as CreditCard;
}

export async function updateCreditCard(
  id: string,
  input: Partial<Omit<CreditCard, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<CreditCard> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("credit_cards").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data as CreditCard;
}

export async function deleteCreditCard(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("credit_cards").delete().eq("id", id);
  if (error) throw error;
}

export async function listLoans(): Promise<Loan[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("loans").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as Loan[];
}

export async function createLoan(
  input: Pick<Loan, "name" | "original_amount" | "balance" | "apr"> &
    Partial<Omit<Loan, "id" | "user_id" | "name" | "original_amount" | "balance" | "apr" | "created_at" | "updated_at">>
): Promise<Loan> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("loans")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as Loan;
}

export async function updateLoan(id: string, input: Partial<Omit<Loan, "id" | "user_id" | "created_at" | "updated_at">>): Promise<Loan> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("loans").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data as Loan;
}

export async function deleteLoan(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("loans").delete().eq("id", id);
  if (error) throw error;
}
