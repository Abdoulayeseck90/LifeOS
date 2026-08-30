import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { billUpdateSchema } from "@/lib/validation/core";
import { getBill, updateBill, deleteBill } from "@/services/core/bills";
import { scheduleRemindersForEvent, cancelRemindersForEntity } from "@/services/core/reminders";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const bill = await getBill(id);
    if (!bill) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: bill });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load bill" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const parsed = billUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const bill = await updateBill(id, parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "update",
      p_entity_type: "bill",
      p_entity_id: bill.id,
      p_metadata: null,
    });

    // A still-pending bill (possibly with a new due_date) reschedules
    // onto that date; paid/cancelled bills should have nothing further
    // fire for them.
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

    return NextResponse.json({ data: bill });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update bill" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    await cancelRemindersForEntity("bill", id);
    await deleteBill(id);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "delete",
      p_entity_type: "bill",
      p_entity_id: id,
      p_metadata: null,
    });

    return NextResponse.json({ data: { id } });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete bill" }, { status: 500 });
  }
}
