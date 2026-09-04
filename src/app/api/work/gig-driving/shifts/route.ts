import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { listGigShiftsWithRelations } from "@/services/work/gig-driving";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;

  try {
    const shifts = await listGigShiftsWithRelations(from, to);
    return NextResponse.json({ data: shifts });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load shifts" }, { status: 500 });
  }
}
