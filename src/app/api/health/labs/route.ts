import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { labResultInputSchema } from "@/lib/validation/health";
import { listLabResults, createLabResult, getTestDefinition } from "@/services/health/labs";
import { createTimelineEvent } from "@/services/core/timeline";
import { createGeneralActivityNotification } from "@/services/core/reminders";

// Mirrors src/app/api/health/conditions/route.ts.

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const labResults = await listLabResults();
    return NextResponse.json({ data: labResults });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load lab results" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = labResultInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const labResult = await createLabResult(parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "create",
      p_entity_type: "lab_result",
      p_entity_id: labResult.id,
      p_metadata: null,
    });

    // Title stored once at write time (like Condition.name/Medication.name,
    // which are stored as-typed too) rather than re-derived per viewing
    // locale — name_en is the pragmatic default for this snapshot label.
    const testDefinition = await getTestDefinition(labResult.test_definition_id);
    await createTimelineEvent({
      event_type: "lab_result",
      date_time: new Date(labResult.collection_date).toISOString(),
      title: testDefinition?.name_en ?? "Lab result",
      domain: "health",
      related_entity_type: "lab_result",
      related_entity_id: labResult.id,
    });

    await createGeneralActivityNotification({
      title: "Lab result added",
      relatedEntityType: "lab_result",
      relatedEntityId: labResult.id,
    });

    return NextResponse.json({ data: labResult }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create lab result" }, { status: 500 });
  }
}
