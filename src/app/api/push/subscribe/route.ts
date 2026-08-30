import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { pushSubscriptionInputSchema } from "@/lib/validation/core";
import { upsertPushSubscription } from "@/services/core/push-subscriptions";

// Called from the browser right after PushManager.subscribe() succeeds
// (src/lib/push/client.ts) — stores the subscription so the reminder
// engine can push to it later. Auth-gated: a subscription always
// belongs to the authenticated user making the request (Spec Section
// 17), never a client-supplied user id.
export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = pushSubscriptionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const subscription = await upsertPushSubscription({
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      authKey: parsed.data.keys.auth,
      deviceLabel: parsed.data.device_label,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json({ data: subscription }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to save push subscription" }, { status: 500 });
  }
}
