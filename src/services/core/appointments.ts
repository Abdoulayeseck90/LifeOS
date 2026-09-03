import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { Appointment, RecurrenceEditScope } from "@/types/health/entities";
import type { UtcBounds } from "@/lib/dates/range";
import { generateOccurrences, type AppointmentOccurrence } from "@/lib/calendar/recurrence";

// Global Calendar's appointment CRUD (moved from
// services/health/appointments.ts — Calendar spec: "Move the primary
// Appointments functionality...into Calendar"). One underlying table
// (`appointments`) serves both plain scheduling and Health-related
// appointments (category='medical' + optional related_condition_id) —
// never two systems. Follows the Conditions pattern
// (src/services/health/conditions.ts).

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

// Occurrence expansion for a visible Calendar range (also used by
// Dashboard's next-appointment lookup via nextOccurrence()). Fetches
// every one of the user's appointment rows — masters, standalone, and
// override rows alike — rather than trying to range-filter the query
// itself: a recurring master's own date_time (its DTSTART, possibly
// long past) says nothing about whether its series still produces
// occurrences in the requested range, so a date-filtered query risks
// silently missing valid occurrences. For a personal calendar's
// realistic per-user row count this full fetch is negligible; the
// actual range filtering happens in generateOccurrences(), which is
// what makes "no duplicates on refresh" true by construction (Calendar
// spec) — it is a pure function over these same rows every time.
export async function listAppointmentOccurrences(
  rangeStart: Date,
  rangeEnd: Date
): Promise<AppointmentOccurrence<Appointment>[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("appointments").select("*");
  if (error) throw error;
  return generateOccurrences(data as Appointment[], rangeStart, rangeEnd);
}

export async function createAppointment(
  input: Pick<Appointment, "date_time"> &
    Partial<
      Omit<
        Appointment,
        "id" | "user_id" | "date_time" | "created_at" | "updated_at" | "recurrence_parent_id" | "recurrence_original_start"
      >
    >
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

// Every edit — recurring or not — goes through update_appointment_scoped
// (0048_calendar_appointments.sql), an invoker-rights function so RLS
// on `appointments` still gates every write exactly as if the client
// issued it directly. scope="series" on a non-recurring appointment is
// a plain full-row update, identical to the pre-recurrence behavior;
// "this"/"following" only apply to a recurring master and require
// occurrenceStart to identify which generated instant is being acted on.
export async function updateAppointment(
  id: string,
  fields: Record<string, unknown>,
  scope: RecurrenceEditScope = "series",
  occurrenceStart: string | null = null
): Promise<Appointment> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_appointment_scoped", {
    p_id: id,
    p_scope: scope,
    p_occurrence_start: occurrenceStart,
    p_fields: fields,
  });

  if (error) throw error;
  return data as Appointment;
}

export async function deleteAppointment(
  id: string,
  scope: RecurrenceEditScope = "series",
  occurrenceStart: string | null = null
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_appointment_scoped", {
    p_id: id,
    p_scope: scope,
    p_occurrence_start: occurrenceStart,
  });

  if (error) throw error;
}
