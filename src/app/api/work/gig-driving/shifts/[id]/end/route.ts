import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { gigShiftEndSchema } from "@/lib/validation/work";
import { endGigShift } from "@/services/work/gig-driving";
import { UserFacingError } from "@/lib/errors";

// Quick End Shift — odometer + per-platform earnings (+ optional
// expenses), written atomically by end_gig_shift() so the shift never
// ends up "completed" with a partially-written earnings/expense set.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const parsed = gigShiftEndSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const shift = await endGigShift(id, parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "update",
      p_entity_type: "gig_shift",
      p_entity_id: shift.id,
      p_metadata: { action: "ended" },
    });

    return NextResponse.json({ data: shift });
  } catch (err) {
    const message = err instanceof UserFacingError ? err.message : "Failed to end shift";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
