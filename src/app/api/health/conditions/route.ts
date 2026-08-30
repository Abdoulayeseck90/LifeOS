import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { conditionInputSchema } from "@/lib/validation/health";
import { listConditions, createCondition } from "@/services/health/conditions";
import { createTimelineEvent } from "@/services/core/timeline";

// Reference implementation for every other /api/health/* route:
// 1. Auth check (never rely on RLS alone to reject unauthenticated calls —
//    fail fast with a clean 401 per Spec Section 30).
// 2. Validate input with the Zod schema.
// 3. Call the service layer, never supabase.from() inline here.
// 4. Write an audit event for create/update/delete (Spec Section 33).
// 5. Write a timeline event when the write is timeline-worthy (Spec
//    Section 20's "Diagnosis events").

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const conditions = await listConditions();
    return NextResponse.json({ data: conditions });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load conditions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = conditionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const condition = await createCondition(parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "create",
      p_entity_type: "condition",
      p_entity_id: condition.id,
      p_metadata: null,
    });

    await createTimelineEvent({
      event_type: "diagnosis",
      date_time: condition.diagnosis_date ? new Date(condition.diagnosis_date).toISOString() : new Date().toISOString(),
      title: condition.name,
      domain: "health",
      related_entity_type: "condition",
      related_entity_id: condition.id,
    });

    return NextResponse.json({ data: condition }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create condition" }, { status: 500 });
  }
}
