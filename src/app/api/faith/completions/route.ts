import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { duaCompletionToggleSchema } from "@/lib/validation/core";
import { toggleCompletion } from "@/services/core/dua-completions";

// Section 10/26: a real two-way toggle, not a one-way "complete"
// action — tapping an already-completed item un-completes it. The
// unique (user_id, routine_id, completed_date) constraint plus this
// lookup-then-insert-or-delete shape is what makes repeated taps safe
// (never a duplicate completion row).
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = duaCompletionToggleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await toggleCompletion(parsed.data.routine_id, parsed.data.dua_id);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "update",
      p_entity_type: "dua_completion",
      p_entity_id: parsed.data.routine_id,
      p_metadata: { completed: result.completed },
    });

    return NextResponse.json({ data: result });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update completion" }, { status: 500 });
  }
}
