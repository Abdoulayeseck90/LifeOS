import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { medicationInputSchema } from "@/lib/validation/health";
import { listMedications, createMedication } from "@/services/health/medications";
import { createTimelineEvent } from "@/services/core/timeline";

// Mirrors src/app/api/health/conditions/route.ts — the reference
// implementation for every /api/health/* route.

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const medications = await listMedications();
    return NextResponse.json({ data: medications });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load medications" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = medicationInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const medication = await createMedication(parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "create",
      p_entity_type: "medication",
      p_entity_id: medication.id,
      p_metadata: null,
    });

    await createTimelineEvent({
      event_type: "medication_start",
      date_time: medication.start_date ? new Date(medication.start_date).toISOString() : new Date().toISOString(),
      title: medication.name,
      domain: "health",
      related_entity_type: "medication",
      related_entity_id: medication.id,
    });

    return NextResponse.json({ data: medication }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create medication" }, { status: 500 });
  }
}
