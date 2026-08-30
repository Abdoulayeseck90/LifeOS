import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { Notification } from "@/types/core/entities";

// Delivery inbox for the reminder engine (see services/core/reminders.ts)
// — also usable directly by anything that wants to notify the user
// without going through a scheduled reminder.

export async function listNotifications(): Promise<Notification[]> {
  const supabase = await createClient();
  // notifications is one of the tables explicitly revoked from anon in
  // 0042_security_hardening.sql, so an unauthenticated call hits a hard
  // "permission denied" instead of RLS's usual empty result — reachable
  // here the same way as listVitals in vitals.ts.
  if (!(await getAuthenticatedUser())) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Notification[];
}

export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createClient();
  // Called from Header on every authenticated page — the widest-reaching
  // instance of the same notifications-table hardening issue above.
  if (!(await getAuthenticatedUser())) return 0;
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("read", false);

  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<Notification> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Notification;
}

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").update({ read: true }).eq("read", false);
  if (error) throw error;
}

// Small, fixed-size read for the header bell popover — never the full
// inbox (that's what /notifications is for).
export async function listRecentNotifications(limit = 5): Promise<Notification[]> {
  const supabase = await createClient();
  // Called from Header on every authenticated page — same reasoning as
  // getUnreadNotificationCount above.
  if (!(await getAuthenticatedUser())) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as Notification[];
}
