import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { duaRoutineInputSchema } from "@/lib/validation/core";
import { listUserDuaRoutines, addToRoutine } from "@/services/core/dua-routines";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const routines = await listUserDuaRoutines();
    return NextResponse.json({ data: routines });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load routine" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = duaRoutineInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const routine = await addToRoutine(parsed.data.dua_id, parsed.data.schedule_type);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "create",
      p_entity_type: "dua_routine_item",
      p_entity_id: routine.id,
      p_metadata: null,
    });

    return NextResponse.json({ data: routine }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to add to routine" }, { status: 500 });
  }
}
