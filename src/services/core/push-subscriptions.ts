import { createClient } from "@/lib/supabase/server";
import type { PushSubscriptionRecord } from "@/types/core/entities";

// Follows the Conditions pattern. Multiple active rows per user are
// expected and normal (Spec Section 7: one per device/browser), not an
// error condition to guard against.

export async function listMyActivePushSubscriptions(): Promise<PushSubscriptionRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as PushSubscriptionRecord[];
}

// Used by the reminder engine (services/core/reminders.ts) to send to
// every active device for a given user — not scoped to "the current
// request's user" like every other service function here, since this
// runs from a background sweep, not a user-initiated request.
export async function listActivePushSubscriptionsForUser(userId: string): Promise<PushSubscriptionRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("push_subscriptions").select("*").eq("user_id", userId).eq("status", "active");

  if (error) throw error;
  return data as PushSubscriptionRecord[];
}

// Upsert on (user_id, endpoint) — re-subscribing the same browser
// (e.g. after a permission reset) updates the existing row instead of
// accumulating duplicates for what the push service considers the same
// registration.
export async function upsertPushSubscription(input: {
  endpoint: string;
  p256dh: string;
  authKey: string;
  deviceLabel?: string;
  userAgent?: string;
}): Promise<PushSubscriptionRecord> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth_key: input.authKey,
        device_label: input.deviceLabel ?? null,
        user_agent: input.userAgent ?? null,
        status: "active",
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "user_id,endpoint" }
    )
    .select()
    .single();

  if (error) throw error;
  return data as PushSubscriptionRecord;
}

export async function deactivatePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("push_subscriptions")
    .update({ status: "inactive" })
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  if (error) throw error;
}

// Called by the reminder engine when a push send comes back 404/410
// (Spec Section 16: "detect the failure, deactivate/remove the invalid
// subscription, do not repeatedly retry"). Not scoped to the current
// request's user for the same reason as listActivePushSubscriptionsForUser.
export async function deactivatePushSubscriptionById(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").update({ status: "inactive" }).eq("id", id);
  if (error) throw error;
}

export async function deletePushSubscription(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("id", id);
  if (error) throw error;
}
