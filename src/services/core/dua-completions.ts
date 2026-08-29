import { createClient } from "@/lib/supabase/server";
import type { DuaCompletion } from "@/types/core/entities";

export async function listCompletionsForDate(date: string): Promise<DuaCompletion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("dua_completions").select("*").eq("completed_date", date);
  if (error) throw error;
  return data as DuaCompletion[];
}

export async function listCompletionsInRange(fromDate: string, toDate: string): Promise<DuaCompletion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dua_completions")
    .select("*")
    .gte("completed_date", fromDate)
    .lte("completed_date", toDate);

  if (error) throw error;
  return data as DuaCompletion[];
}

// Section 26's idempotency guard (unique on user_id/routine_id/
// completed_date) plus Section 10's checklist implying a real toggle:
// tapping an incomplete item completes it, tapping an already-complete
// item un-completes it by deleting the row — never a duplicate insert
// either way. Returns the resulting state so the UI can reflect it
// without a second round trip.
export async function toggleCompletion(routineId: string, duaId: string): Promise<{ completed: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const today = new Date().toISOString().slice(0, 10);

  const { data: existing, error: lookupError } = await supabase
    .from("dua_completions")
    .select("id")
    .eq("routine_id", routineId)
    .eq("completed_date", today)
    .maybeSingle();
  if (lookupError) throw lookupError;

  if (existing) {
    const { error } = await supabase.from("dua_completions").delete().eq("id", existing.id);
    if (error) throw error;
    return { completed: false };
  }

  const { error } = await supabase
    .from("dua_completions")
    .insert({ user_id: user.id, dua_id: duaId, routine_id: routineId, completed_date: today });
  if (error) throw error;
  return { completed: true };
}
