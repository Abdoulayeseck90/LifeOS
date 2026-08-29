import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getConditionCrossReferences } from "@/services/health/conditions";

// On-demand only (fetched client-side when the Condition detail modal
// opens, not preloaded for every condition on the list page) — avoids
// an N+1 fan-out at page load for data most conditions won't have the
// user actually open.
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
    const crossReferences = await getConditionCrossReferences(id);
    return NextResponse.json({ data: crossReferences });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load related records" }, { status: 500 });
  }
}
