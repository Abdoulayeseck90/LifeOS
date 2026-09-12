import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { appointmentBulkInputSchema } from "@/lib/validation/core";
import { createAppointmentsBulk } from "@/services/core/appointments";
import { createTimelineEvent } from "@/services/core/timeline";
import { scheduleAppointmentSeriesReminders } from "@/services/core/reminders";

// Plan Week / Plan Month (Gig Driving spec): one call creates every
// selected shift atomically -- either the whole batch succeeds or none
// of it does (create_appointments_bulk, 0052_gig_schedule_required_times.sql),
// never a silent partial batch. Every created row is a standalone
// appointment (no recurrence_rule/parent), so it's immediately editable/
// deletable exactly like a manually created single shift -- mirrors the
// single-create POST route (../route.ts) for validation/side-effects,
// just looped over N items instead of one.

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = appointmentBulkInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const appointments = await createAppointmentsBulk(parsed.data.items);

    for (const appointment of appointments) {
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

      await scheduleAppointmentSeriesReminders(appointment.id);
    }

    return NextResponse.json({ data: appointments }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create appointments" }, { status: 500 });
  }
}
