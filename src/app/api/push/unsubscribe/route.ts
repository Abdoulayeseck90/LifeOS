import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { pushUnsubscribeInputSchema } from "@/lib/validation/core";
import { deactivatePushSubscriptionByEndpoint } from "@/services/core/push-subscriptions";

// Called when the user explicitly turns push off for this browser (or
// the browser itself reports the subscription as gone) — deactivates
// rather than deletes, consistent with reminders/reminders never
// hard-deleting a record of what happened.
export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = pushUnsubscribeInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await deactivatePushSubscriptionByEndpoint(parsed.data.endpoint);
    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
  }
}
