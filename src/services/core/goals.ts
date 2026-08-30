import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { Goal } from "@/types/core/entities";

export async function listGoals(): Promise<Goal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("goals").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as Goal[];
}

export async function getGoal(id: string): Promise<Goal | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("goals").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Goal | null;
}

export async function createGoal(
  input: Pick<Goal, "title"> & Partial<Omit<Goal, "id" | "user_id" | "title" | "created_at" | "updated_at">>
): Promise<Goal> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("goals")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as Goal;
}

export async function updateGoal(id: string, input: Partial<Omit<Goal, "id" | "user_id" | "created_at" | "updated_at">>): Promise<Goal> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("goals").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data as Goal;
}

export async function deleteGoal(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) throw error;
}
