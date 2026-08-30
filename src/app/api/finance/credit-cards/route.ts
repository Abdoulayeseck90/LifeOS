import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { creditCardInputSchema } from "@/lib/validation/core";
import { listCreditCards, createCreditCard } from "@/services/core/credit-and-loans";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const cards = await listCreditCards();
    return NextResponse.json({ data: cards });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load credit cards" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const parsed = creditCardInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const card = await createCreditCard(parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "create",
      p_entity_type: "credit_card",
      p_entity_id: card.id,
      p_metadata: null,
    });

    return NextResponse.json({ data: card }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create credit card" }, { status: 500 });
  }
}
