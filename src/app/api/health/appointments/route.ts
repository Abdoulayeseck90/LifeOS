import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { appointmentInputSchema } from "@/lib/validation/health";
import { listAppointments, createAppointment } from "@/services/health/appointments";
import { createTimelineEvent } from "@/services/core/timeline";
import { scheduleRemindersForEvent } from "@/services/core/reminders";

// Mirrors src/app/api/health/conditions/route.ts.

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const appointments = await listAppointments();
    return NextResponse.json({ data: appointments });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load appointments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = appointmentInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const appointment = await createAppointment(parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "create",
      p_entity_type: "appointment",
      p_entity_id: appointment.id,
      p_metadata: null,
    });

    await createTimelineEvent({
      event_type: "appointment",
      date_time: new Date(appointment.date_time).toISOString(),
      title: appointment.provider_name,
      domain: "health",
      related_entity_type: "appointment",
      related_entity_id: appointment.id,
    });

    if (appointment.status === "scheduled") {
      await scheduleRemindersForEvent({
        relatedEntityType: "appointment",
        relatedEntityId: appointment.id,
        dueAt: appointment.date_time,
        isDateOnly: false,
        category: "appointments",
        title: appointment.provider_name,
      });
    }

    return NextResponse.json({ data: appointment }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}
