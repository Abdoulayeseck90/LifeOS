import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { deleteHydrationLogEntry } from "@/services/health/nutrition";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    await deleteHydrationLogEntry(id);
    return NextResponse.json({ data: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete hydration entry" }, { status: 500 });
  }
}
