import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { financeTransactionInputSchema } from "@/lib/validation/core";
import { listFinanceTransactions, createFinanceTransaction } from "@/services/core/finance";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const transactions = await listFinanceTransactions();
    return NextResponse.json({ data: transactions });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load transactions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const parsed = financeTransactionInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const transaction = await createFinanceTransaction(parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "create",
      p_entity_type: "finance_transaction",
      p_entity_id: transaction.id,
      p_metadata: null,
    });

    return NextResponse.json({ data: transaction }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
  }
}
