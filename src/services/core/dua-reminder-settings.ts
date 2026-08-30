import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { DuaReminderScheduleType, DuaReminderSetting } from "@/types/core/entities";

const SCHEDULE_TYPES: DuaReminderScheduleType[] = ["morning", "evening", "before_sleep"];

// Always returns exactly 3 rows (one per named block) — creates any
// missing default (disabled, 08:00) on first read rather than making
// every caller handle a partial/missing settings row.
export async function listDuaReminderSettings(): Promise<DuaReminderSetting[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase.from("dua_reminder_settings").select("*").order("schedule_type");
  if (error) throw error;

  const existing = data as DuaReminderSetting[];
  const missing = SCHEDULE_TYPES.filter((type) => !existing.some((row) => row.schedule_type === type));
  if (missing.length === 0) return existing;

  // upsert + ignoreDuplicates (not a plain insert): this function is
  // called unguarded from the /faith/dua Server Component's own
  // Promise.all, so a concurrent call for the same brand-new user (two
  // tabs opened at once, a fast double-navigation) racing to create the
  // same missing row would otherwise hit the (user_id, schedule_type)
  // unique constraint and throw — crashing the whole page render
  // instead of just quietly losing the race. ignoreDuplicates makes the
  // losing call a no-op; re-selecting afterward guarantees the complete
  // set of 3 rows is returned regardless of which call actually won.
  const { error: upsertError } = await supabase
    .from("dua_reminder_settings")
    .upsert(
      missing.map((schedule_type) => ({ user_id: user.id, schedule_type })),
      { onConflict: "user_id,schedule_type", ignoreDuplicates: true }
    );
  if (upsertError) throw upsertError;

  const { data: complete, error: refetchError } = await supabase.from("dua_reminder_settings").select("*").order("schedule_type");
  if (refetchError) throw refetchError;

  return complete as DuaReminderSetting[];
}

export async function updateDuaReminderSetting(
  scheduleType: DuaReminderScheduleType,
  input: { enabled: boolean; time_of_day: string }
): Promise<DuaReminderSetting> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("dua_reminder_settings")
    .upsert({ user_id: user.id, schedule_type: scheduleType, ...input }, { onConflict: "user_id,schedule_type" })
    .select()
    .single();

  if (error) throw error;
  return data as DuaReminderSetting;
}
