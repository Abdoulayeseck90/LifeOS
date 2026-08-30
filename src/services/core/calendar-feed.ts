import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { generateCalendarFeedToken, hashCalendarFeedToken } from "@/lib/calendar/feed-token";

export interface CalendarFeedStatus {
  hasActiveToken: boolean;
  createdAt: string | null;
}

// Settings UI status check — a normal authenticated read via RLS
// (calendar_feed_tokens_select_own), same as any other per-user
// settings row. Never returns the raw token (it was never stored).
export async function getCalendarFeedStatus(): Promise<CalendarFeedStatus> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("calendar_feed_tokens")
    .select("created_at")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) throw error;
  return { hasActiveToken: data !== null, createdAt: (data?.created_at as string | undefined) ?? null };
}

// Generate (or regenerate) the subscription link. Revokes any existing
// active token first so the old URL stops working immediately — exactly
// one live token per user at a time, matching the Settings UI's single
// Generate/Regenerate concept rather than a list of links. Returns the
// raw token exactly once; only its hash is ever persisted.
export async function regenerateCalendarFeedToken(): Promise<{ token: string; createdAt: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Not authenticated");

  const { error: revokeError } = await supabase
    .from("calendar_feed_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("revoked_at", null);
  if (revokeError) throw revokeError;

  const token = generateCalendarFeedToken();
  const { data, error } = await supabase
    .from("calendar_feed_tokens")
    .insert({ user_id: user.id, token_hash: hashCalendarFeedToken(token) })
    .select("created_at")
    .single();
  if (error) throw error;

  return { token, createdAt: data.created_at as string };
}
