import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { payBillInputSchema } from "@/lib/validation/core";
import { payBill } from "@/services/core/bills";
import { scheduleRemindersForEvent, cancelRemindersForEntity } from "@/services/core/reminders";
import { UserFacingError } from "@/lib/errors";

// Bills spec, Section 22: "Mark as Paid" creates exactly one linked
// Expense — see payBill() in services/core/bills.ts for the
// duplicate-prevention/recurring-advance logic itself; this route only
// wires the resulting bill state to the reminder engine.
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
  const parsed = payBillInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { bill, transaction } = await payBill(id, {
      paidDate: parsed.data.paid_date,
      amount: parsed.data.amount,
    });

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "update",
      p_entity_type: "bill",
      p_entity_id: bill.id,
      p_metadata: { action: "paid", transaction_id: transaction.id },
    });

    // Recurring bill rolled forward to its next due_date and is pending
    // again → reschedule reminders for that date. A one-time bill is
    // now paid for good → cancel whatever was still pending for it.
    if (bill.status === "pending" && bill.reminders_enabled) {
      await scheduleRemindersForEvent({
        relatedEntityType: "bill",
        relatedEntityId: bill.id,
        dueAt: bill.due_date,
        isDateOnly: true,
        category: "bills",
        title: bill.name,
      });
    } else {
      await cancelRemindersForEntity("bill", bill.id);
    }

    return NextResponse.json({ data: { bill, transaction } });
  } catch (err) {
    // Only ever surface our own hand-written, already-safe domain
    // errors ("Bill is already paid") — a raw Supabase/Postgres error
    // (a constraint violation, a schema-cache miss) falls through to
    // the generic message instead of reaching the client verbatim.
    const message = err instanceof UserFacingError ? err.message : "Failed to mark bill as paid";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
