import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteMonitoringPlan, listMonitoringItems } from "@/services/health/monitoring";
import { cancelRemindersForEntity } from "@/services/core/reminders";

// DELETE only — plans are read via listMonitoringPlans and edited by
// their name/description not yet needing a dedicated edit form here.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    // The plan->items cascade (on delete cascade) removes the item rows
    // themselves, but reminders is a polymorphic table with no real FK
    // to cascade through — cancel each item's reminders explicitly first.
    const items = await listMonitoringItems(id);
    await Promise.all(items.map((item) => cancelRemindersForEntity("monitoring_item", item.id)));

    await deleteMonitoringPlan(id);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "delete",
      p_entity_type: "monitoring_plan",
      p_entity_id: id,
      p_metadata: null,
    });

    return NextResponse.json({ data: { id } });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete monitoring plan" }, { status: 500 });
  }
}
