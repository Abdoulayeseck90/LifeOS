import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { deletePushSubscription } from "@/services/core/push-subscriptions";

// Settings → Notifications → "Your Devices" → Remove (Spec Section 19).
// RLS (push_subscriptions_all_own) is the actual ownership boundary — a
// delete for a subscription that isn't the caller's own simply matches
// zero rows, same as every other delete route in this app.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await deletePushSubscription(id);
    return NextResponse.json({ data: { id } });
  } catch (err) {
    return NextResponse.json({ error: "Failed to remove device" }, { status: 500 });
  }
}
