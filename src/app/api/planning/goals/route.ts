import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { goalInputSchema } from "@/lib/validation/core";
import { listGoals, createGoal } from "@/services/core/goals";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const goals = await listGoals();
    return NextResponse.json({ data: goals });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load goals" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const parsed = goalInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const goal = await createGoal(parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "create",
      p_entity_type: "goal",
      p_entity_id: goal.id,
      p_metadata: null,
    });

    return NextResponse.json({ data: goal }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });
  }
}
