import webpush from "web-push";

// Server-only wrapper around the `web-push` library — the VAPID private
// key is read here (server env var) and nowhere else; it must never
// reach a client bundle (Spec Section 17). NEXT_PUBLIC_VAPID_PUBLIC_KEY
// is safe to expose (that's the whole point of the NEXT_PUBLIC_ prefix)
// and is read directly by the browser in lib/push/client.ts.

let configured = false;

function ensureConfigured(): void {
  if (configured) return;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:support@example.com";

  if (!publicKey || !privateKey) {
    throw new Error("Push not configured: NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export function isPushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

// Kept intentionally short (Spec Section 10: "Keep push notifications
// concise... Avoid putting detailed health information in the
// notification title/body") — url is where the service worker's
// notificationclick handler (public/sw.js) navigates on tap.
export interface PushPayload {
  title: string;
  body: string;
  url: string;
}

export interface PushSubscriptionKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export class PushSendError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "PushSendError";
  }
}

// The push service only confirms it *accepted* the request for
// delivery — never that the device actually displayed it (Spec Section
// 14: "Do not claim device delivery if the push service only accepted
// the request"). Callers should record this as "sent", the same
// non-overclaiming convention already used for email (see
// services/core/reminders.ts / email.ts's 'delivered' comment).
export async function sendPushNotification(subscription: PushSubscriptionKeys, payload: PushPayload): Promise<void> {
  ensureConfigured();

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload)
    );
  } catch (err) {
    const statusCode = isWebPushError(err) ? err.statusCode : undefined;
    const message = err instanceof Error ? err.message : "Push send failed";
    throw new PushSendError(message, statusCode);
  }
}

function isWebPushError(err: unknown): err is { statusCode: number } {
  return typeof err === "object" && err !== null && "statusCode" in err && typeof (err as { statusCode: unknown }).statusCode === "number";
}

// 404/410 from the push service means the subscription is gone for good
// (browser unsubscribed locally, endpoint expired) — Spec Section 16:
// "do not repeatedly retry an invalid subscription." Any other error
// (network blip, 5xx from the push service) is treated as transient and
// left alone for the next scheduled attempt.
export function isSubscriptionGone(err: unknown): boolean {
  return err instanceof PushSendError && (err.statusCode === 404 || err.statusCode === 410);
}
