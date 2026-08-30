import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { listTimelineEvents } from "@/services/core/timeline";

// Read-only — timeline rows are written by domain services as a side
// effect of other actions (Spec Section 20), never directly by a client
// POST, so there is no write endpoint here.

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const events = await listTimelineEvents();
    return NextResponse.json({ data: events });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load timeline" }, { status: 500 });
  }
}
