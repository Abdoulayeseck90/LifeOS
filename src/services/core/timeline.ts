import { createClient } from "@/lib/supabase/server";
import type { TimelineEvent } from "@/types/core/entities";

// Core-level service. Read-only from the end user's perspective — rows
// are written by domain API routes as a side effect of other actions
// (Spec Section 20), via createTimelineEvent below, never typed in
// directly. Called from the API route layer (same placement as the
// existing write_audit_event calls) rather than from inside each
// services/health/*.ts create function, so both side effects live next
// to each other at the point where a write is known to have succeeded.

export async function listTimelineEvents(): Promise<TimelineEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timeline_events")
    .select("*")
    .order("date_time", { ascending: false });

  if (error) throw error;
  return data as TimelineEvent[];
}

// IMPORTANT: every one of this function's ~11 call sites (health API
// routes) invokes it — per this file's own opening comment — "at the
// point where a write is known to have succeeded," and none of them
// use the returned TimelineEvent (all just `await createTimelineEvent
// ({...})` and discard it). A failure recording the derived timeline
// feed must never be reported back as "failed to save the condition/
// appointment/lab result/etc." when that primary record already saved
// — the exact same class of bug found and fixed in
// services/core/reminders.ts for reminder scheduling. This therefore
// never throws; a real failure is still logged server-side. Returns
// null on failure since every caller already ignores the return value.
export async function createTimelineEvent(
  input: Pick<TimelineEvent, "event_type" | "date_time" | "title" | "domain"> &
    Partial<Omit<TimelineEvent, "id" | "user_id" | "event_type" | "date_time" | "title" | "domain" | "created_at">>
): Promise<TimelineEvent | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("timeline_events")
      .insert({ ...input, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return data as TimelineEvent;
  } catch (err) {
    console.error("[timeline] createTimelineEvent failed (the primary save is unaffected):", {
      event_type: input.event_type,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
