import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteMonitoringItem } from "@/services/health/monitoring";
import { cancelRemindersForEntity } from "@/services/core/reminders";

// DELETE only — items are edited via the dedicated complete/next-due
// actions (this domain's actual "editing" is due-date/completion
// tracking, not generic field editing).
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
    await cancelRemindersForEntity("monitoring_item", id);
    await deleteMonitoringItem(id);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "delete",
      p_entity_type: "monitoring_item",
      p_entity_id: id,
      p_metadata: null,
    });

    return NextResponse.json({ data: { id } });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete monitoring item" }, { status: 500 });
  }
}
