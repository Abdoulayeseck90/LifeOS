import { createClient } from "@/lib/supabase/server";
import type { Dua, DuaCategory } from "@/types/core/entities";
import type { DuaInput } from "@/lib/validation/core";

// RLS (migration 0041) already scopes SELECT to built-in rows + the
// caller's own personal Duas — no is_builtin/created_by filter needed
// here, the database enforces it.
export async function listDuas(): Promise<Dua[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("duas").select("*").order("title", { ascending: true });
  if (error) throw error;
  return data as Dua[];
}

export async function getDua(id: string): Promise<Dua | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("duas").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Dua | null;
}

// Personal Duas only — is_builtin/verification_status/created_by are
// never accepted from the caller (Section 24: "Never allow ordinary
// users to modify built-in verified Dua content"). RLS's INSERT policy
// (with check is_builtin = false and created_by = auth.uid()) is the
// real enforcement; these fixed values just make sure a well-formed
// request always satisfies it.
export async function createDua(input: DuaInput): Promise<Dua> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("duas")
    .insert({
      ...input,
      category: (input.category ?? "personal") as DuaCategory,
      is_builtin: false,
      created_by: user.id,
      verification_status: "needs_verification",
    })
    .select()
    .single();

  if (error) throw error;
  return data as Dua;
}

// RLS's UPDATE/DELETE policies (is_builtin = false and created_by =
// auth.uid()) block any attempt against a built-in row server-side —
// these calls simply return zero affected rows rather than needing an
// application-level ownership check duplicated here.
export async function updateDua(id: string, input: Partial<DuaInput>): Promise<Dua> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("duas").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data as Dua;
}

export async function deleteDua(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("duas").delete().eq("id", id);
  if (error) throw error;
}
