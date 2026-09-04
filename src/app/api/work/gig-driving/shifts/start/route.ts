import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { gigShiftStartSchema } from "@/lib/validation/work";
import { startGigShift } from "@/services/work/gig-driving";
import { UserFacingError } from "@/lib/errors";

// Quick Start Shift — the spec's core fast-path ("the user may be
// standing next to their vehicle"): odometer + platform(s), nothing
// else required. gig_shifts_one_in_progress_per_user (0050_gig_driving.sql)
// is the real guard against a duplicate start; startGigShift() translates
// that constraint violation into a friendly UserFacingError.
export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const parsed = gigShiftStartSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const shift = await startGigShift(parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "create",
      p_entity_type: "gig_shift",
      p_entity_id: shift.id,
      p_metadata: null,
    });

    return NextResponse.json({ data: shift }, { status: 201 });
  } catch (err) {
    const message = err instanceof UserFacingError ? err.message : "Failed to start shift";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
