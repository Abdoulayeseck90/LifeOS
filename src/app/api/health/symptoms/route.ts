import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { symptomEntryInputSchema } from "@/lib/validation/health";
import { listSymptomEntries, createSymptomEntry } from "@/services/health/symptoms";
import { createTimelineEvent } from "@/services/core/timeline";
import { createGeneralActivityNotification } from "@/services/core/reminders";

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
    const symptomEntries = await listSymptomEntries();
    return NextResponse.json({ data: symptomEntries });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load symptom entries" }, { status: 500 });
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
  const parsed = symptomEntryInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const symptomEntry = await createSymptomEntry(parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "create",
      p_entity_type: "symptom_entry",
      p_entity_id: symptomEntry.id,
      p_metadata: null,
    });

    await createTimelineEvent({
      event_type: "symptom",
      date_time: new Date().toISOString(),
      title: symptomEntry.symptom,
      domain: "health",
      related_entity_type: "symptom_entry",
      related_entity_id: symptomEntry.id,
    });

    await createGeneralActivityNotification({
      title: "Symptom logged",
      relatedEntityType: "symptom_entry",
      relatedEntityId: symptomEntry.id,
    });

    return NextResponse.json({ data: symptomEntry }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create symptom entry" }, { status: 500 });
  }
}
