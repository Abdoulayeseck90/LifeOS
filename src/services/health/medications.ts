import { createClient } from "@/lib/supabase/server";
import type { Medication } from "@/types/health/entities";

// Follows the Conditions pattern (src/services/health/conditions.ts) —
// components and API routes call these functions, never supabase.from()
// directly (Spec Section 48).

export async function listMedications(): Promise<Medication[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("medications")
    .select("*")
    .order("status", { ascending: true })
    .order("start_date", { ascending: false });

  if (error) throw error;
  return data as Medication[];
}

export async function getMedication(id: string): Promise<Medication | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("medications")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as Medication | null;
}

export async function createMedication(
  input: Pick<Medication, "name"> & Partial<Omit<Medication, "id" | "user_id" | "name" | "created_at" | "updated_at">>
): Promise<Medication> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("medications")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as Medication;
}

export async function updateMedication(
  id: string,
  input: Partial<Omit<Medication, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<Medication> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("medications").update(input).eq("id", id).select().single();

  if (error) throw error;
  return data as Medication;
}

export async function deleteMedication(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("medications").delete().eq("id", id);
  if (error) throw error;
}
