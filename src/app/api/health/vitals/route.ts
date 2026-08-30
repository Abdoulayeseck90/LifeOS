import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { vitalInputSchema } from "@/lib/validation/health";
import { listVitals, createVital } from "@/services/health/vitals";
import { createTimelineEvent } from "@/services/core/timeline";
import { createGeneralActivityNotification } from "@/services/core/reminders";
import type { VitalType } from "@/types/health/entities";

// Mirrors src/app/api/health/conditions/route.ts. ?type= lets a client
// narrow to one vital_type (e.g. the Blood Pressure history view)
// without filtering the full list client-side.

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const type = new URL(request.url).searchParams.get("type") as VitalType | null;

  try {
    const vitals = await listVitals(type ?? undefined);
    return NextResponse.json({ data: vitals });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load vitals" }, { status: 500 });
  }
}

const VITAL_TITLES: Record<VitalType, string> = {
  blood_pressure: "Blood pressure recorded",
  heart_rate: "Heart rate recorded",
  temperature: "Temperature recorded",
  spo2: "Blood oxygen recorded",
  respiratory_rate: "Respiratory rate recorded",
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = vitalInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const vital = await createVital(parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "create",
      p_entity_type: "vital",
      p_entity_id: vital.id,
      p_metadata: null,
    });

    const title = VITAL_TITLES[vital.vital_type];
    await createTimelineEvent({
      event_type: "vital",
      date_time: vital.recorded_at,
      title,
      domain: "health",
      related_entity_type: "vital",
      related_entity_id: vital.id,
    });

    await createGeneralActivityNotification({
      title,
      relatedEntityType: "vital",
      relatedEntityId: vital.id,
    });

    return NextResponse.json({ data: vital }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create vital" }, { status: 500 });
  }
}
