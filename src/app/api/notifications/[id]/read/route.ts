import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { markNotificationRead } from "@/services/core/notifications";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const notification = await markNotificationRead(id);
    return NextResponse.json({ data: notification });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}
