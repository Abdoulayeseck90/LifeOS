import { createClient } from "@/lib/supabase/server";
import type { TaskRecord } from "@/types/core/entities";

export async function listTasks(): Promise<TaskRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").select("*").order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data as TaskRecord[];
}

export async function getTask(id: string): Promise<TaskRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as TaskRecord | null;
}

export async function createTask(
  input: Pick<TaskRecord, "title"> & Partial<Omit<TaskRecord, "id" | "user_id" | "title" | "created_at" | "updated_at">>
): Promise<TaskRecord> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as TaskRecord;
}

export async function updateTask(
  id: string,
  input: Partial<Omit<TaskRecord, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<TaskRecord> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data as TaskRecord;
}

export async function deleteTask(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}
