import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { Note } from "@/types/core/entities";

// Pinned-first, then newest-first — matches the Notes spec's "pinned
// notes appear first" requirement directly at the query level.
export async function listNotes(): Promise<Note[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data as Note[];
}

export async function getNote(id: string): Promise<Note | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("notes").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Note | null;
}

export async function createNote(
  input: Partial<Omit<Note, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<Note> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("notes")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as Note;
}

export async function updateNote(id: string, input: Partial<Omit<Note, "id" | "user_id" | "created_at" | "updated_at">>): Promise<Note> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("notes").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data as Note;
}

export async function deleteNote(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw error;
}
