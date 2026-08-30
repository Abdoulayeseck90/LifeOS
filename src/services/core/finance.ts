import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { FinanceTransaction } from "@/types/core/entities";

export async function listFinanceTransactions(): Promise<FinanceTransaction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("finance_transactions").select("*").order("date", { ascending: false });
  if (error) throw error;
  return data as FinanceTransaction[];
}

export async function getFinanceTransaction(id: string): Promise<FinanceTransaction | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("finance_transactions").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as FinanceTransaction | null;
}

export async function createFinanceTransaction(
  input: Pick<FinanceTransaction, "type" | "description" | "amount" | "category"> &
    Partial<Omit<FinanceTransaction, "id" | "user_id" | "type" | "description" | "amount" | "category" | "created_at" | "updated_at">>
): Promise<FinanceTransaction> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("finance_transactions")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as FinanceTransaction;
}

export async function updateFinanceTransaction(
  id: string,
  input: Partial<Omit<FinanceTransaction, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<FinanceTransaction> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("finance_transactions").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data as FinanceTransaction;
}

export async function deleteFinanceTransaction(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("finance_transactions").delete().eq("id", id);
  if (error) throw error;
}
