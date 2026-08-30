import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { monitoringItemNextDueUpdateSchema } from "@/lib/validation/health";
import { updateMonitoringItemNextDue } from "@/services/health/monitoring";
import { scheduleRemindersForEvent } from "@/services/core/reminders";

// Addendum Section 11: next due date must remain user-editable after
// automatic calculation.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = monitoringItemNextDueUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const item = await updateMonitoringItemNextDue(id, parsed.data.next_due_at);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "update",
      p_entity_type: "monitoring_item",
      p_entity_id: item.id,
      p_metadata: { action: "next_due_at_edited" },
    });

    // The manual edit this route exists for (Addendum Section 11) changes
    // the due date out from under any reminders already scheduled for the
    // old one — re-running the scheduler upserts them onto the new date
    // instead of leaving stale rows pointed at the old due date.
    await scheduleRemindersForEvent({
      relatedEntityType: "monitoring_item",
      relatedEntityId: item.id,
      dueAt: item.next_due_at as string,
      isDateOnly: true,
      category: "monitoring",
      title: item.name,
    });

    return NextResponse.json({ data: item });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update next due date" }, { status: 500 });
  }
}
