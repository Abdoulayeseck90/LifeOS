import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { Business } from "@/types/core/entities";

export async function listBusinesses(): Promise<Business[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("businesses").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as Business[];
}

export async function getBusiness(id: string): Promise<Business | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("businesses").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Business | null;
}

export async function createBusiness(
  input: Pick<Business, "name"> & Partial<Omit<Business, "id" | "user_id" | "name" | "created_at" | "updated_at">>
): Promise<Business> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("businesses")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as Business;
}

export async function updateBusiness(
  id: string,
  input: Partial<Omit<Business, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<Business> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("businesses").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data as Business;
}

export async function deleteBusiness(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("businesses").delete().eq("id", id);
  if (error) throw error;
}
