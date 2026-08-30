import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { subscriptionInputSchema } from "@/lib/validation/core";
import { listSubscriptions, createSubscription } from "@/services/core/subscriptions";
import { scheduleRemindersForEvent } from "@/services/core/reminders";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const subscriptions = await listSubscriptions();
    return NextResponse.json({ data: subscriptions });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load subscriptions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = subscriptionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const subscription = await createSubscription(parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "create",
      p_entity_type: "subscription",
      p_entity_id: subscription.id,
      p_metadata: null,
    });

    if (subscription.reminders_enabled) {
      await scheduleRemindersForEvent({
        relatedEntityType: "subscription",
        relatedEntityId: subscription.id,
        dueAt: subscription.next_billing_date,
        isDateOnly: true,
        category: "subscriptions",
        title: subscription.name,
      });
    }

    return NextResponse.json({ data: subscription }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
  }
}
