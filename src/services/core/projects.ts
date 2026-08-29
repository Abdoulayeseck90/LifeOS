import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/types/core/entities";

// Planning & Business spec — same list/get/create/update/delete shape
// as every other LifeOS domain service (see services/health/conditions.ts).
// Cross-module filtering (e.g. "projects for business X") is done by the
// caller over the full listProjects() result, not a dedicated query —
// dataset sizes here are small and this keeps Business's "same row, not
// duplicated" requirement trivially true (one query, filtered in memory).

export async function listProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as Project[];
}

export async function getProject(id: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Project | null;
}

export async function createProject(
  input: Pick<Project, "name"> & Partial<Omit<Project, "id" | "user_id" | "name" | "created_at" | "updated_at">>
): Promise<Project> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("projects")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as Project;
}

export async function updateProject(id: string, input: Partial<Omit<Project, "id" | "user_id" | "created_at" | "updated_at">>): Promise<Project> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data as Project;
}

export async function deleteProject(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}
