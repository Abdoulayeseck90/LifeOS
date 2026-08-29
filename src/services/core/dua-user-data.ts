import { createClient } from "@/lib/supabase/server";
import type { DuaUserData } from "@/types/core/entities";

export async function listDuaUserData(): Promise<DuaUserData[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("dua_user_data").select("*");
  if (error) throw error;
  return data as DuaUserData[];
}

export async function toggleFavorite(duaId: string): Promise<DuaUserData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existing, error: lookupError } = await supabase
    .from("dua_user_data")
    .select("*")
    .eq("dua_id", duaId)
    .maybeSingle();
  if (lookupError) throw lookupError;

  const { data, error } = await supabase
    .from("dua_user_data")
    .upsert(
      { user_id: user.id, dua_id: duaId, favorited: !(existing?.favorited ?? false) },
      { onConflict: "user_id,dua_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data as DuaUserData;
}

export async function updateDuaNote(duaId: string, notes: string): Promise<DuaUserData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("dua_user_data")
    .upsert({ user_id: user.id, dua_id: duaId, notes }, { onConflict: "user_id,dua_id" })
    .select()
    .single();

  if (error) throw error;
  return data as DuaUserData;
}
