import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { gigExpenseInputSchema } from "@/lib/validation/work";
import { createGigExpense, listGigExpenses } from "@/services/work/gig-driving";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;

  try {
    const expenses = await listGigExpenses(from, to);
    return NextResponse.json({ data: expenses });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load expenses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const parsed = gigExpenseInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const expense = await createGigExpense(parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "create",
      p_entity_type: "gig_expense",
      p_entity_id: expense.id,
      p_metadata: null,
    });

    return NextResponse.json({ data: expense }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}
