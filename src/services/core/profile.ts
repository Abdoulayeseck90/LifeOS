import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { Profile } from "@/types/core/entities";
import { mergeNotificationPreferences } from "@/lib/notifications/preferences";

// Follows the Conditions pattern (src/services/health/conditions.ts).
// profiles is keyed by user_id with a DB trigger auto-creating the row
// on signup (0001_core.sql, handle_new_user) — so a row always exists
// for an authenticated user by the time this runs.

// The one place a raw Supabase profiles row becomes a real, complete
// Profile. Never trust that notification_preferences/timezone actually
// have the expected shape at runtime just because the TS type says so —
// a row from before those columns existed, a row the notification-
// scheduling migration hasn't reached yet on this database, or a stale
// partial write can all leave them null/undefined/incomplete. Every
// caller of getProfile/updateProfile/syncTwoFactorStatus gets the
// normalized result, so nothing downstream needs its own defensive
// merge or optional chaining to stay safe.
function normalizeProfile(data: Record<string, unknown>): Profile {
  return {
    id: data.id as string,
    user_id: data.user_id as string,
    display_name: (data.display_name as string | null) ?? null,
    preferred_language: (data.preferred_language as Profile["preferred_language"]) ?? "en",
    two_factor_enabled: Boolean(data.two_factor_enabled),
    timezone: typeof data.timezone === "string" && data.timezone.length > 0 ? data.timezone : "UTC",
    notification_preferences: mergeNotificationPreferences(data.notification_preferences),
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
  };
}

// Returns null rather than throwing when unauthenticated — same reason
// as syncTwoFactorStatus below: the (app) route group layout is the
// actual auth gate, but Next.js can start a page's data fetch in
// parallel with a parent layout's redirect, so this can run once
// against an unauthenticated request in practice (e.g. the dashboard's
// Promise.all). Every caller already handles a null profile (optional
// chaining on profile?.timezone/display_name, or its own separate auth
// gate before ever calling this), so this was always safe to return
// rather than throw — the throw was just inconsistent with this
// function's own `Profile | null` return type.
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeProfile(data) : null;
}

export async function updateProfile(
  input: Partial<Pick<Profile, "display_name" | "preferred_language" | "timezone" | "notification_preferences">>
): Promise<Profile> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .update(input)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) throw error;
  return normalizeProfile(data);
}

// Keeps profiles.two_factor_enabled truthful against Supabase's actual
// MFA factor state — never trust a client-sent value for this flag
// (Spec Section 6.2: 2FA status is a real security signal, not cosmetic).
// Returns null rather than throwing when unauthenticated: the (app)
// route group layout is the actual auth gate, but Next.js can start a
// page's data fetch in parallel with a parent layout's redirect, so this
// can run once against an unauthenticated request in practice.
export async function syncTwoFactorStatus(): Promise<Profile | null> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError) throw factorsError;

  const hasVerifiedTotp = factorsData.totp.some((factor) => factor.status === "verified");

  const { data, error } = await supabase
    .from("profiles")
    .update({ two_factor_enabled: hasVerifiedTotp })
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) throw error;
  return normalizeProfile(data);
}
