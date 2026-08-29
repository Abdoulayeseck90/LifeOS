import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { monitoringItemInputSchema } from "@/lib/validation/health";
import { listMonitoringItems, createMonitoringItem } from "@/services/health/monitoring";
import { scheduleRemindersForEvent } from "@/services/core/reminders";

// Mirrors src/app/api/health/conditions/route.ts. ?plan_id filters to
// one plan's items.

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const planId = new URL(request.url).searchParams.get("plan_id") ?? undefined;

  try {
    const items = await listMonitoringItems(planId);
    return NextResponse.json({ data: items });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load monitoring items" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = monitoringItemInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const item = await createMonitoringItem(parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "create",
      p_entity_type: "monitoring_item",
      p_entity_id: item.id,
      p_metadata: null,
    });

    if (item.next_due_at) {
      await scheduleRemindersForEvent({
        relatedEntityType: "monitoring_item",
        relatedEntityId: item.id,
        dueAt: item.next_due_at,
        isDateOnly: true,
        category: "monitoring",
        title: item.name,
      });
    }

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create monitoring item" }, { status: 500 });
  }
}
