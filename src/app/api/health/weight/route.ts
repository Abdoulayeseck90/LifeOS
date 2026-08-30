import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { bodyMetricInputSchema } from "@/lib/validation/health";
import { listBodyMetrics, createBodyMetric } from "@/services/health/body-metrics";
import { createTimelineEvent } from "@/services/core/timeline";
import { createGeneralActivityNotification } from "@/services/core/reminders";

// Mirrors src/app/api/health/conditions/route.ts. Route path is "weight"
// to match the sidebar nav link (/health/weight); the underlying table
// is body_metrics since it also covers height/BMI/waist/body fat.

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const bodyMetrics = await listBodyMetrics();
    return NextResponse.json({ data: bodyMetrics });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load body metrics" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = bodyMetricInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const bodyMetric = await createBodyMetric(parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "create",
      p_entity_type: "body_metric",
      p_entity_id: bodyMetric.id,
      p_metadata: null,
    });

    await createTimelineEvent({
      event_type: "body_metric",
      date_time: new Date(bodyMetric.measured_at).toISOString(),
      title: `${bodyMetric.metric_type}: ${bodyMetric.value} ${bodyMetric.unit}`,
      domain: "health",
      related_entity_type: "body_metric",
      related_entity_id: bodyMetric.id,
    });

    // Spec's "IN-APP BY DEFAULT" list names weight specifically — not
    // every body-metric type this route also handles (height/BMI/etc).
    if (bodyMetric.metric_type === "weight") {
      await createGeneralActivityNotification({
        title: "Weight logged",
        relatedEntityType: "body_metric",
        relatedEntityId: bodyMetric.id,
      });
    }

    return NextResponse.json({ data: bodyMetric }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create body metric" }, { status: 500 });
  }
}
