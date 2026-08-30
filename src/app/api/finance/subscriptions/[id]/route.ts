import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { subscriptionUpdateSchema } from "@/lib/validation/core";
import { getSubscription, updateSubscription, deleteSubscription } from "@/services/core/subscriptions";
import { scheduleRemindersForEvent, cancelRemindersForEntity } from "@/services/core/reminders";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const subscription = await getSubscription(id);
    if (!subscription) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: subscription });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load subscription" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const parsed = subscriptionUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const subscription = await updateSubscription(id, parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "update",
      p_entity_type: "subscription",
      p_entity_id: subscription.id,
      p_metadata: null,
    });

    // An active subscription (possibly with a new next_billing_date)
    // reschedules onto that date; paused/cancelled should have nothing
    // further fire for it.
    if (subscription.status === "active" && subscription.reminders_enabled) {
      await scheduleRemindersForEvent({
        relatedEntityType: "subscription",
        relatedEntityId: subscription.id,
        dueAt: subscription.next_billing_date,
        isDateOnly: true,
        category: "subscriptions",
        title: subscription.name,
      });
    } else {
      await cancelRemindersForEntity("subscription", subscription.id);
    }

    return NextResponse.json({ data: subscription });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    await cancelRemindersForEntity("subscription", id);
    await deleteSubscription(id);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "delete",
      p_entity_type: "subscription",
      p_entity_id: id,
      p_metadata: null,
    });

    return NextResponse.json({ data: { id } });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete subscription" }, { status: 500 });
  }
}
