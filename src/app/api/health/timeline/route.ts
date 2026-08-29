import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listTimelineEvents } from "@/services/core/timeline";

// Read-only — timeline rows are written by domain services as a side
// effect of other actions (Spec Section 20), never directly by a client
// POST, so there is no write endpoint here.

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
