import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { removeFromRoutine } from "@/services/core/dua-routines";

// Section 9: "Do not permanently lock the routine" — removing an item
// is always available and just deletes the routine row (cascading to
// its own completion history), never touching the Dua content itself.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await removeFromRoutine(id);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "delete",
      p_entity_type: "dua_routine_item",
      p_entity_id: id,
      p_metadata: null,
    });

    return NextResponse.json({ data: { id } });
  } catch (err) {
    return NextResponse.json({ error: "Failed to remove from routine" }, { status: 500 });
  }
}
