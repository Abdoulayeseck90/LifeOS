import { createClient } from "@/lib/supabase/server";
import type { BodyMetric } from "@/types/health/entities";
import type { UtcBounds } from "@/lib/dates/range";

// Follows the Conditions pattern (src/services/health/conditions.ts).

// measured_at is timestamptz — see appointments.ts's listAppointments
// for why callers must pass already-timezone-converted UTC bounds.
export async function listBodyMetrics(utcBounds?: UtcBounds): Promise<BodyMetric[]> {
  const supabase = await createClient();
  let query = supabase.from("body_metrics").select("*");

  if (utcBounds?.fromUtc) query = query.gte("measured_at", utcBounds.fromUtc);
  if (utcBounds?.toUtcExclusive) query = query.lt("measured_at", utcBounds.toUtcExclusive);

  const { data, error } = await query.order("measured_at", { ascending: false });
  if (error) throw error;
  return data as BodyMetric[];
}

export async function getBodyMetric(id: string): Promise<BodyMetric | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("body_metrics")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as BodyMetric | null;
}

export async function createBodyMetric(
  input: Pick<BodyMetric, "metric_type" | "value" | "unit" | "measured_at"> &
    Partial<Omit<BodyMetric, "id" | "user_id" | "metric_type" | "value" | "unit" | "measured_at" | "created_at">>
): Promise<BodyMetric> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("body_metrics")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as BodyMetric;
}

export async function updateBodyMetric(
  id: string,
  input: Partial<Omit<BodyMetric, "id" | "user_id" | "created_at">>
): Promise<BodyMetric> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("body_metrics").update(input).eq("id", id).select().single();

  if (error) throw error;
  return data as BodyMetric;
}

export async function deleteBodyMetric(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("body_metrics").delete().eq("id", id);
  if (error) throw error;
}
