import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { monitoringItemCompletionSchema } from "@/lib/validation/health";
import { completeMonitoringItem } from "@/services/health/monitoring";
import { createTimelineEvent } from "@/services/core/timeline";
import { scheduleRemindersForEvent, cancelRemindersForEntity } from "@/services/core/reminders";

// Addendum Section 10: "Mark Completed" — a completion note is optional
// (the fuller "Enter Result / Upload Report" sub-flow from the addendum
// isn't built here; the user separately logs the actual lab_result /
// diagnostic_test via the existing forms and can reference it in this
// note — a real simplification worth flagging, not a hidden gap).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = monitoringItemCompletionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const item = await completeMonitoringItem(id, parsed.data.completed_at);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "update",
      p_entity_type: "monitoring_item",
      p_entity_id: item.id,
      p_metadata: { action: "completed" },
    });

    await createTimelineEvent({
      event_type: "monitoring_completed",
      date_time: new Date(item.last_completed_at ?? new Date().toISOString().slice(0, 10)).toISOString(),
      title: item.name,
      description: parsed.data.notes ?? null,
      domain: "health",
      related_entity_type: "monitoring_item",
      related_entity_id: item.id,
    });

    // Recurring items come back from completeMonitoringItem() with a
    // freshly recalculated next_due_at — schedule reminders for that
    // next occurrence. One-time items have no next_due_at: cancel
    // whatever was still pending for the old due date instead, since
    // the item is done and nothing further should fire for it.
    if (item.next_due_at) {
      await scheduleRemindersForEvent({
        relatedEntityType: "monitoring_item",
        relatedEntityId: item.id,
        dueAt: item.next_due_at,
        isDateOnly: true,
        category: "monitoring",
        title: item.name,
      });
    } else {
      await cancelRemindersForEntity("monitoring_item", item.id);
    }

    return NextResponse.json({ data: item });
  } catch (err) {
    return NextResponse.json({ error: "Failed to complete monitoring item" }, { status: 500 });
  }
}
