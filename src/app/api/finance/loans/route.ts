import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { loanInputSchema } from "@/lib/validation/core";
import { listLoans, createLoan } from "@/services/core/credit-and-loans";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const loans = await listLoans();
    return NextResponse.json({ data: loans });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load loans" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const parsed = loanInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const loan = await createLoan(parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "create",
      p_entity_type: "loan",
      p_entity_id: loan.id,
      p_metadata: null,
    });

    return NextResponse.json({ data: loan }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create loan" }, { status: 500 });
  }
}
