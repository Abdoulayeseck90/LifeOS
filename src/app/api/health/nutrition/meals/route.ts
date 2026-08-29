import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mealLogEntryInputSchema } from "@/lib/validation/health";
import { listMealLogEntries, createMealLogEntry } from "@/services/health/nutrition";

// Mirrors src/app/api/health/conditions/route.ts.

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const mealLogEntries = await listMealLogEntries();
    return NextResponse.json({ data: mealLogEntries });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load meal log entries" }, { status: 500 });
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
  const parsed = mealLogEntryInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const mealLogEntry = await createMealLogEntry(parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "create",
      p_entity_type: "meal_log_entry",
      p_entity_id: mealLogEntry.id,
      p_metadata: null,
    });

    return NextResponse.json({ data: mealLogEntry }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create meal log entry" }, { status: 500 });
  }
}
