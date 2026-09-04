import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { gigExpenseUpdateSchema } from "@/lib/validation/work";
import { updateGigExpense, deleteGigExpense } from "@/services/work/gig-driving";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const parsed = gigExpenseUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const expense = await updateGigExpense(id, parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "update",
      p_entity_type: "gig_expense",
      p_entity_id: expense.id,
      p_metadata: null,
    });

    return NextResponse.json({ data: expense });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    await deleteGigExpense(id);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "delete",
      p_entity_type: "gig_expense",
      p_entity_id: id,
      p_metadata: null,
    });

    return NextResponse.json({ data: { id } });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
