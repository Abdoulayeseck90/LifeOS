import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { appointmentUpdateSchema } from "@/lib/validation/health";
import { getAppointment, updateAppointment, deleteAppointment } from "@/services/health/appointments";
import { scheduleRemindersForEvent, cancelRemindersForEntity } from "@/services/core/reminders";

// Single-record operations, mirroring the auth-check → validate →
// service-call → audit-event shape of every other route in this app.

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
    const appointment = await updateAppointment(id, parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "update",
      p_entity_type: "appointment",
      p_entity_id: appointment.id,
      p_metadata: null,
    });

    // Still scheduled (possibly a new date_time) → re-run the scheduler,
    // which upserts onto the new date; cancelled/completed/no-show → no
    // future reminder should fire for it anymore.
    if (appointment.status === "scheduled") {
      await scheduleRemindersForEvent({
        relatedEntityType: "appointment",
        relatedEntityId: appointment.id,
        dueAt: appointment.date_time,
        isDateOnly: false,
        category: "appointments",
        title: appointment.provider_name,
      });
    } else {
      await cancelRemindersForEntity("appointment", appointment.id);
    }

    return NextResponse.json({ data: appointment });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await cancelRemindersForEntity("appointment", id);
    await deleteAppointment(id);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "delete",
      p_entity_type: "appointment",
      p_entity_id: id,
      p_metadata: null,
    });

    return NextResponse.json({ data: { id } });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete appointment" }, { status: 500 });
  }
}
