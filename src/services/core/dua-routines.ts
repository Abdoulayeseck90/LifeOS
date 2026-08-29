import { createClient } from "@/lib/supabase/server";
import type { DuaScheduleType, UserDuaRoutineWithDua } from "@/types/core/entities";

// Embedded-resource select (same syntax as services/health/labs.ts's
// test_definitions join) — one query returns each routine item with its
// Dua content attached, never duplicating the Dua itself (Section 9).
export async function listUserDuaRoutines(): Promise<UserDuaRoutineWithDua[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_dua_routines")
    .select("*, duas(*)")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data as unknown as UserDuaRoutineWithDua[];
}

export async function addToRoutine(duaId: string, scheduleType: DuaScheduleType): Promise<UserDuaRoutineWithDua> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("user_dua_routines")
    .insert({ user_id: user.id, dua_id: duaId, schedule_type: scheduleType })
    .select("*, duas(*)")
    .single();

  if (error) throw error;
  return data as unknown as UserDuaRoutineWithDua;
}

// Section 9: "Allow the user to remove it later. Do not permanently
// lock the routine." A SOFT delete (active = false), not a real DELETE
// — dua_completions.routine_id has "on delete cascade" against this
// table, so hard-deleting the row would silently destroy every day of
// completion history for that Dua along with it, directly contradicting
// Section 11's "do not delete historical completion data." Setting
// active = false instead removes it from listUserDuaRoutines()'s
// `.eq("active", true)` result (so it disappears from the routine
// exactly as expected) while the row — and every completion that
// references it — stays intact for History to keep showing.
export async function removeFromRoutine(routineId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("user_dua_routines").update({ active: false }).eq("id", routineId);
  if (error) throw error;
}
