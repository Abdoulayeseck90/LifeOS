import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { monitoringPlanInputSchema } from "@/lib/validation/health";
import { listMonitoringPlans, createMonitoringPlan } from "@/services/health/monitoring";

// Mirrors src/app/api/health/conditions/route.ts.

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const plans = await listMonitoringPlans();
    return NextResponse.json({ data: plans });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load monitoring plans" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = monitoringPlanInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const plan = await createMonitoringPlan(parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "create",
      p_entity_type: "monitoring_plan",
      p_entity_id: plan.id,
      p_metadata: null,
    });

    return NextResponse.json({ data: plan }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create monitoring plan" }, { status: 500 });
  }
}
