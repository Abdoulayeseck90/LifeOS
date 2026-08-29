"use client";

// Browser-only Web Push helpers — never imported from a server
// component/route. See public/sw.js for the service worker itself and
// lib/push/web-push.ts for the server-side sender.

export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// iOS Safari only supports Web Push from a Home-Screen-installed PWA,
// not a regular Safari tab (Spec Section 5) — `standalone` is Safari's
// own (non-standard) flag for "running from the Home Screen icon."
// `display-mode: standalone` is the standard equivalent other browsers
// use for the same installed state.
export function isRunningAsInstalledPwa(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
}

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register("/sw.js");
}

// Push API subscriptions require the VAPID public key as a raw
// Uint8Array, not the base64url string it's normally shared as — this
// is the standard conversion (see the Web Push spec / MDN).
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(registration: ServiceWorkerRegistration): Promise<PushSubscription> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) throw new Error("Push is not configured (NEXT_PUBLIC_VAPID_PUBLIC_KEY missing)");

  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  });
}

// Best-effort, cosmetic-only label for the Settings device list (Spec
// Section 19) — never parsed for anything functional.
export function detectDeviceLabel(): string {
  if (typeof navigator === "undefined") return "Unknown device";
  const ua = navigator.userAgent;

  let platform = "Device";
  if (/iphone/i.test(ua)) platform = "iPhone";
  else if (/ipad/i.test(ua)) platform = "iPad";
  else if (/android/i.test(ua)) platform = "Android";
  else if (/mac os/i.test(ua)) platform = "Mac";
  else if (/windows/i.test(ua)) platform = "Windows";

  let browser = "Browser";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/chrome\//i.test(ua)) browser = "Chrome";
  else if (/firefox\//i.test(ua)) browser = "Firefox";
  else if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) browser = "Safari";

  return `${browser} on ${platform}`;
}

export function pushSubscriptionToJson(subscription: PushSubscription): { endpoint: string; keys: { p256dh: string; auth: string } } {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error("Push subscription is missing required fields");
  }
  return { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } };
}

// Single source of truth for "what should the Push UI show right now" —
// shared by the soft-ask banner and the Settings page so they never
// disagree about whether push is actually usable (Spec Section 24: one
// coherent architecture). iOS Safari only supports Web Push from an
// installed Home-Screen PWA (Spec Section 5) — that's a distinct,
// actionable state from "this browser doesn't support push at all."
export type PushUiStatus = "ios-needs-install" | "unsupported" | "denied" | "not-enabled" | "enabled";

export function computePushUiStatus(): PushUiStatus {
  if (isIos() && !isRunningAsInstalledPwa()) return "ios-needs-install";
  if (!isPushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission === "granted") return "enabled";
  return "not-enabled";
}

export type EnablePushResult = { ok: true } | { ok: false; reason: "unsupported" | "denied" | "error"; message?: string };

// The full "user tapped Enable Notifications" flow (Spec Section 2/3):
// request the native permission prompt (only ever called from this
// explicit, intentional user action — never on page load), register
// the service worker, subscribe, and persist the subscription
// server-side. Every failure mode returns a typed result instead of
// throwing, so the caller can show a calm message rather than a raw error.
export async function enablePushNotifications(): Promise<EnablePushResult> {
  if (!isPushSupported()) return { ok: false, reason: "unsupported" };

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: "denied" };

    const registration = await registerServiceWorker();
    const subscription = await subscribeToPush(registration);
    const { endpoint, keys } = pushSubscriptionToJson(subscription);

    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint, keys, device_label: detectDeviceLabel() }),
    });
    if (!response.ok) return { ok: false, reason: "error", message: "Failed to save your subscription." };

    return { ok: true };
  } catch (err) {
    return { ok: false, reason: "error", message: err instanceof Error ? err.message : "Something went wrong." };
  }
}
