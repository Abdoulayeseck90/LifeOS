import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nutritionRestrictionUpdateSchema } from "@/lib/validation/health";
import {
  getNutritionRestriction,
  updateNutritionRestriction,
  deleteNutritionRestriction,
} from "@/services/health/nutrition";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const restriction = await getNutritionRestriction(id);
    if (!restriction) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ data: restriction });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load restriction" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = nutritionRestrictionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const restriction = await updateNutritionRestriction(id, parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "update",
      p_entity_type: "nutrition_restriction",
      p_entity_id: restriction.id,
      p_metadata: null,
    });

    return NextResponse.json({ data: restriction });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update restriction" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await deleteNutritionRestriction(id);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "delete",
      p_entity_type: "nutrition_restriction",
      p_entity_id: id,
      p_metadata: null,
    });

    return NextResponse.json({ data: { id } });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete restriction" }, { status: 500 });
  }
}
