import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { billInputSchema } from "@/lib/validation/core";
import { listBills, createBill } from "@/services/core/bills";
import { scheduleRemindersForEvent } from "@/services/core/reminders";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const bills = await listBills();
    return NextResponse.json({ data: bills });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load bills" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = billInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const bill = await createBill(parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "create",
      p_entity_type: "bill",
      p_entity_id: bill.id,
      p_metadata: null,
    });

    if (bill.reminders_enabled) {
      await scheduleRemindersForEvent({
        relatedEntityType: "bill",
        relatedEntityId: bill.id,
        dueAt: bill.due_date,
        isDateOnly: true,
        category: "bills",
        title: bill.name,
      });
    }

    return NextResponse.json({ data: bill }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create bill" }, { status: 500 });
  }
}
