import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { appointmentUpdateSchema, appointmentDeleteSchema } from "@/lib/validation/core";
import { getAppointment, updateAppointment, deleteAppointment } from "@/services/core/appointments";
import { cancelRemindersForEntity, scheduleAppointmentReminder, scheduleAppointmentSeriesReminders } from "@/services/core/reminders";

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
    // update_appointment_scoped() writes the FULL field set every time
    // (an insert for "this"/"following", a full update for "series") —
    // it has no concept of "leave unspecified fields alone," so the
    // current row's values fill in anything this PATCH didn't touch.
    // end_time/related_condition_id/reminder_lead_minutes/
    // recurrence_rule use an explicit undefined-check (not `??`) since
    // those four can be intentionally cleared with a real `null` —
    // `??` would incorrectly treat that null as "unset" and fall back
    // to the old value instead of clearing it.
    const mergedFields = {
      title: changes.title ?? current.title,
      description: changes.description ?? current.description,
      provider_name: changes.provider_name ?? current.provider_name,
      specialty: changes.specialty ?? current.specialty,
      appointment_type: changes.appointment_type ?? current.appointment_type,
      date_time: changes.date_time ?? current.date_time,
      end_time: changes.end_time !== undefined ? changes.end_time : current.end_time,
      location: changes.location ?? current.location,
      category: changes.category ?? current.category,
      status: changes.status ?? current.status,
      related_condition_id: changes.related_condition_id !== undefined ? changes.related_condition_id : current.related_condition_id,
      preparation_notes: changes.preparation_notes ?? current.preparation_notes,
      clinician_instructions: changes.clinician_instructions ?? current.clinician_instructions,
      follow_up_date: changes.follow_up_date ?? current.follow_up_date,
      notes: changes.notes ?? current.notes,
      gig_platforms: changes.gig_platforms !== undefined ? changes.gig_platforms : current.gig_platforms,
      gig_earnings_goal: changes.gig_earnings_goal !== undefined ? changes.gig_earnings_goal : current.gig_earnings_goal,
      reminder_lead_minutes: changes.reminder_lead_minutes !== undefined ? changes.reminder_lead_minutes : current.reminder_lead_minutes,
      recurrence_rule: changes.recurrence_rule !== undefined ? changes.recurrence_rule : current.recurrence_rule,
    };

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
    return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 });
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
