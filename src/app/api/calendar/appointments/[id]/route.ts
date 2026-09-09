import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { appointmentUpdateSchema, appointmentDeleteSchema } from "@/lib/validation/core";
import { getAppointment, updateAppointment, deleteAppointment } from "@/services/core/appointments";
import { cancelRemindersForEntity, scheduleAppointmentReminder, scheduleAppointmentSeriesReminders } from "@/services/core/reminders";
import { mergeAppointmentFields } from "@/lib/calendar/appointment-merge";
import { UserFacingError } from "@/lib/errors";

// Moved from src/app/api/health/appointments/[id]/route.ts — appointments
// are now a global Calendar feature (Calendar spec), not Health-specific.
// PATCH/DELETE both carry an edit scope ("series" | "this" | "following")
// per the recurring-appointment spec, resolved server-side by
// update_appointment_scoped()/delete_appointment_scoped()
// (0048_calendar_appointments.sql) — this route never decides recurrence
// semantics itself, only passes the validated scope through.

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const appointment = await getAppointment(id);
    if (!appointment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ data: appointment });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load appointment" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = appointmentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const current = await getAppointment(id);
    if (!current) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { scope, occurrence_start, ...changes } = parsed.data;
    const mergedFields = mergeAppointmentFields(current, changes);

    const result = await updateAppointment(id, mergedFields, scope, occurrence_start ?? null);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "update",
      p_entity_type: "appointment",
      p_entity_id: result.id,
      p_metadata: null,
    });

    if (result.recurrence_parent_id) {
      // scope="this" created/updated an override row — it's a real row
      // with its own reminder, and the master's remaining virtual
      // occurrences need reconciling since this changes which instant
      // is excluded from the series.
      await scheduleAppointmentReminder(result);
      await scheduleAppointmentSeriesReminders(result.recurrence_parent_id);
    } else {
      await scheduleAppointmentSeriesReminders(result.id);
      // scope="following" splits the series into a new row (`result`) —
      // the original id is now a differently-capped series and may still
      // have stale composite reminders for occurrences past the cutoff.
      if (result.id !== id) {
        await scheduleAppointmentSeriesReminders(id);
      }
    }

    return NextResponse.json({ data: result });
  } catch (err) {
    const message = err instanceof UserFacingError ? err.message : "Failed to update appointment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = appointmentDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const existing = await getAppointment(id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await cancelRemindersForEntity("appointment", id);
    await deleteAppointment(id, parsed.data.scope, parsed.data.occurrence_start ?? null);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "delete",
      p_entity_type: "appointment",
      p_entity_id: id,
      p_metadata: null,
    });

    // Reconciles the relevant series regardless of which scope was used:
    // deleting an override reconciles its parent; deleting/capping a
    // master reconciles the master's own id (a no-op cleanup if the
    // whole series was just deleted outright).
    const parentId = existing.recurrence_parent_id ?? id;
    await scheduleAppointmentSeriesReminders(parentId);

    return NextResponse.json({ data: { id } });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete appointment" }, { status: 500 });
  }
}
