import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordSubscriptionChargeInputSchema } from "@/lib/validation/core";
import { recordSubscriptionCharge } from "@/services/core/subscriptions";
import { scheduleRemindersForEvent } from "@/services/core/reminders";
import { UserFacingError } from "@/lib/errors";

// Subscriptions spec, Section 29: "Record Charge" — see
// recordSubscriptionCharge() in services/core/subscriptions.ts for the
// linked-Expense-creation logic; this route only reschedules the
// reminder onto the freshly advanced next_billing_date.
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
  const parsed = recordSubscriptionChargeInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { subscription, transaction } = await recordSubscriptionCharge(id, {
      chargeDate: parsed.data.charge_date,
      amount: parsed.data.amount,
    });

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "update",
      p_entity_type: "subscription",
      p_entity_id: subscription.id,
      p_metadata: { action: "charged", transaction_id: transaction.id },
    });

    if (subscription.status === "active" && subscription.reminders_enabled) {
      await scheduleRemindersForEvent({
        relatedEntityType: "subscription",
        relatedEntityId: subscription.id,
        dueAt: subscription.next_billing_date,
        isDateOnly: true,
        category: "subscriptions",
        title: subscription.name,
      });
    }

    return NextResponse.json({ data: { subscription, transaction } });
  } catch (err) {
    const message = err instanceof UserFacingError ? err.message : "Failed to record subscription charge";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
