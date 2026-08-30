import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { recordVitalsInputSchema } from "@/lib/validation/health";
import { recordVitalsSession } from "@/services/health/vitals-session";
import { UserFacingError } from "@/lib/errors";

// The combined "+ Record Vitals" endpoint (Spec Section 4) — one
// request, any subset of measurements, at most one blood-pressure row,
// one heart-rate row (never both for the same reading — see
// vitals-session.ts), one temperature/respiratory-rate/SpO2 row each,
// and weight/height/BMI rows, all sharing one recorded_at and one
// consolidated timeline event.
export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = recordVitalsInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await recordVitalsSession(parsed.data);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err) {
    const message = err instanceof UserFacingError ? err.message : "Failed to record vitals";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
