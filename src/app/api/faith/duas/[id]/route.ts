import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { duaUpdateSchema } from "@/lib/validation/core";
import { getDua, updateDua, deleteDua } from "@/services/core/duas";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const dua = await getDua(id);
    if (!dua) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: dua });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load Dua" }, { status: 500 });
  }
}

// RLS blocks this against a built-in row server-side (Section 24) — a
// request against someone else's personal Dua or a built-in Dua simply
// updates zero rows rather than needing an app-level ownership check.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const parsed = duaUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const dua = await updateDua(id, parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "update",
      p_entity_type: "dua",
      p_entity_id: dua.id,
      p_metadata: null,
    });

    return NextResponse.json({ data: dua });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update Dua" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    await deleteDua(id);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "delete",
      p_entity_type: "dua",
      p_entity_id: id,
      p_metadata: null,
    });

    return NextResponse.json({ data: { id } });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete Dua" }, { status: 500 });
  }
}
