import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { markAllNotificationsRead } from "@/services/core/notifications";

export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await markAllNotificationsRead();
    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
