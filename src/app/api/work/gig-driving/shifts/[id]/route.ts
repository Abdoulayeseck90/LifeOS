import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { cancelGigShift, deleteGigShift, getGigShift } from "@/services/work/gig-driving";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const shift = await getGigShift(id);
    if (!shift) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: shift });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load shift" }, { status: 500 });
  }
}

// PATCH here only ever cancels an in-progress shift (abandoning it) —
// editing a completed shift's details isn't exposed; delete + re-record
// via Quick Start/End covers that instead, keeping this route narrow.
export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const shift = await cancelGigShift(id);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "update",
      p_entity_type: "gig_shift",
      p_entity_id: shift.id,
      p_metadata: { action: "cancelled" },
    });

    return NextResponse.json({ data: shift });
  } catch (err) {
    return NextResponse.json({ error: "Failed to cancel shift" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    await deleteGigShift(id);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "delete",
      p_entity_type: "gig_shift",
      p_entity_id: id,
      p_metadata: null,
    });

    return NextResponse.json({ data: { id } });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete shift" }, { status: 500 });
  }
}
