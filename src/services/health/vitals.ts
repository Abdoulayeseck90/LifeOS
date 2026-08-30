import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { Vital, VitalType } from "@/types/health/entities";
import type { UtcBounds } from "@/lib/dates/range";

// Follows the Conditions/BodyMetrics pattern. One table for every vital
// type (see 0014_vitals.sql) — vitalType narrows the list, but there is
// no per-type table to branch on.

// recorded_at is timestamptz — see appointments.ts's listAppointments
// for why callers must pass already-timezone-converted UTC bounds
// rather than raw date strings.
export async function listVitals(vitalType?: VitalType, utcBounds?: UtcBounds): Promise<Vital[]> {
  const supabase = await createClient();
  let query = supabase.from("vitals").select("*");
  if (vitalType) query = query.eq("vital_type", vitalType);
  if (utcBounds?.fromUtc) query = query.gte("recorded_at", utcBounds.fromUtc);
  if (utcBounds?.toUtcExclusive) query = query.lt("recorded_at", utcBounds.toUtcExclusive);

  const { data, error } = await query.order("recorded_at", { ascending: false });
  if (error) throw error;
  return data as Vital[];
}

export async function getVital(id: string): Promise<Vital | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("vitals").select("*").eq("id", id).maybeSingle();

  if (error) throw error;
  return data as Vital | null;
}

export async function createVital(
  input: Pick<Vital, "vital_type" | "recorded_at"> &
    Partial<Omit<Vital, "id" | "user_id" | "vital_type" | "recorded_at" | "created_at" | "updated_at">>
): Promise<Vital> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("vitals")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as Vital;
}

export async function updateVital(
  id: string,
  input: Partial<Omit<Vital, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<Vital> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("vitals").update(input).eq("id", id).select().single();

  if (error) throw error;
  return data as Vital;
}

export async function deleteVital(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("vitals").delete().eq("id", id);
  if (error) throw error;
}
