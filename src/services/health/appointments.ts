import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { Appointment } from "@/types/health/entities";
import type { UtcBounds } from "@/lib/dates/range";

// Follows the Conditions pattern (src/services/health/conditions.ts).

// date_time is timestamptz — callers pass already-converted UTC bounds
// (lib/dates/range.ts's dateRangeToUtcBounds, using the user's own
// profile timezone), never raw from/to date strings, since a plain date
// comparison against a timestamptz column would silently use the
// database's own timezone instead of the user's.
export async function listAppointments(utcBounds?: UtcBounds): Promise<Appointment[]> {
  const supabase = await createClient();
  let query = supabase.from("appointments").select("*");

  if (utcBounds?.fromUtc) query = query.gte("date_time", utcBounds.fromUtc);
  if (utcBounds?.toUtcExclusive) query = query.lt("date_time", utcBounds.toUtcExclusive);

  const { data, error } = await query.order("date_time", { ascending: true });
  if (error) throw error;
  return data as Appointment[];
}

export async function getAppointment(id: string): Promise<Appointment | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as Appointment | null;
}

export async function createAppointment(
  input: Pick<Appointment, "provider_name" | "date_time"> &
    Partial<Omit<Appointment, "id" | "user_id" | "provider_name" | "date_time" | "created_at" | "updated_at">>
): Promise<Appointment> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("appointments")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as Appointment;
}

export async function updateAppointment(
  id: string,
  input: Partial<Omit<Appointment, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<Appointment> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Appointment;
}

export async function deleteAppointment(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) throw error;
}
