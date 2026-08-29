"use client";

import { useEffect } from "react";
import { startSyncListeners, drainQueue } from "@/lib/offline/sync-queue";
import { registerServiceWorker } from "@/lib/push/client";

// Renders nothing — mounted once at the (app) layout root so the
// online-listener + fallback poll (src/lib/offline/sync-queue.ts) exist
// for the whole authenticated app, regardless of which page is open.
// Also registers public/sw.js unconditionally here (not gated behind
// the push opt-in flow like src/lib/push/client.ts's other call site) —
// the offline navigation fallback it now also provides (Offline
// Strategy spec) needs to work whether or not the user has ever enabled
// push notifications. Registering the same script twice is a no-op, so
// this doesn't conflict with the push-triggered registration.
export function OfflineSyncInit() {
  useEffect(() => {
    startSyncListeners();
    drainQueue().catch(() => undefined);
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      registerServiceWorker().catch(() => undefined);
    }
  }, []);

  return null;
}
