import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { appointmentInputSchema } from "@/lib/validation/core";
import { listAppointments, createAppointment } from "@/services/core/appointments";
import { createTimelineEvent } from "@/services/core/timeline";
import { scheduleAppointmentSeriesReminders } from "@/services/core/reminders";

// Moved from src/app/api/health/appointments/route.ts — appointments are
// now a global Calendar feature (Calendar spec), not Health-specific.
// Mirrors src/app/api/health/conditions/route.ts otherwise.

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
    const title = appointment.title ?? appointment.provider_name ?? "Appointment";

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
      title,
      domain: "health",
      related_entity_type: "appointment",
      related_entity_id: appointment.id,
    });

    // Handles both recurring and non-recurring appointments uniformly —
    // a non-recurring row just expands to its own single occurrence.
    await scheduleAppointmentSeriesReminders(appointment.id);

    return NextResponse.json({ data: appointment }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}
