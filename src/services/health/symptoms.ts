import { createClient } from "@/lib/supabase/server";
import type { SymptomEntry } from "@/types/health/entities";
import type { UtcBounds } from "@/lib/dates/range";

// Follows the Conditions pattern (src/services/health/conditions.ts).

// symptom_entries has no dedicated "date experienced" column — created_at
// (timestamptz, when the entry was logged) is the only date this
// entity has, so that's what the date filter applies to. See
// appointments.ts's listAppointments for why callers pass already-
// timezone-converted UTC bounds rather than raw date strings.
export async function listSymptomEntries(utcBounds?: UtcBounds): Promise<SymptomEntry[]> {
  const supabase = await createClient();
  let query = supabase.from("symptom_entries").select("*");

  if (utcBounds?.fromUtc) query = query.gte("created_at", utcBounds.fromUtc);
  if (utcBounds?.toUtcExclusive) query = query.lt("created_at", utcBounds.toUtcExclusive);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return data as SymptomEntry[];
}

export async function getSymptomEntry(id: string): Promise<SymptomEntry | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("symptom_entries")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as SymptomEntry | null;
}

export async function createSymptomEntry(
  input: Pick<SymptomEntry, "symptom"> & Partial<Omit<SymptomEntry, "id" | "user_id" | "symptom" | "created_at">>
): Promise<SymptomEntry> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("symptom_entries")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as SymptomEntry;
}

export async function updateSymptomEntry(
  id: string,
  input: Partial<Omit<SymptomEntry, "id" | "user_id" | "created_at">>
): Promise<SymptomEntry> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("symptom_entries").update(input).eq("id", id).select().single();

  if (error) throw error;
  return data as SymptomEntry;
}

export async function deleteSymptomEntry(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("symptom_entries").delete().eq("id", id);
  if (error) throw error;
}
