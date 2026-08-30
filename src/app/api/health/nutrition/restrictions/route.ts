import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { nutritionRestrictionInputSchema } from "@/lib/validation/health";
import { listNutritionRestrictions, createNutritionRestriction } from "@/services/health/nutrition";

// Mirrors src/app/api/health/conditions/route.ts.

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const restrictions = await listNutritionRestrictions();
    return NextResponse.json({ data: restrictions });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load nutrition restrictions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = nutritionRestrictionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const restriction = await createNutritionRestriction(parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "create",
      p_entity_type: "nutrition_restriction",
      p_entity_id: restriction.id,
      p_metadata: null,
    });

    return NextResponse.json({ data: restriction }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create nutrition restriction" }, { status: 500 });
  }
}
