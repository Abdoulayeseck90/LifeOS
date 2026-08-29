// LifeOS service worker — Web Push display/click routing, plus (Offline
// Strategy spec) a narrow navigation-fallback cache for exactly the 4
// offline-eligible route groups (Notes/Tasks/Dua/Finance). Still
// deliberately minimal — no Workbox, no whole-app precaching, no
// caching of API routes or any other page. Registered unconditionally
// from OfflineSyncInit (src/components/core/offline-sync-init.tsx) so
// the offline fallback works regardless of whether the user has opted
// into push; also (still) registered from the push opt-in flow
// (src/lib/push/client.ts) — registering the same script twice is a
// no-op, so both call sites are safe.

const OFFLINE_CACHE = "lifeos-offline-shell-v1";
const OFFLINE_URL = "/offline.html";
// Matches /notes, /tasks, /faith/dua, /finance with an optional
// 2-letter next-intl locale prefix (/en/tasks, /fr/faith/dua, ...).
const OFFLINE_ELIGIBLE_PATTERN = /^\/([a-z]{2}\/)?(notes|tasks|faith\/dua|finance)(\/|$|\?)/;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_URL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Network-first, falling back to the cached offline shell only for a
// full-page navigation to an offline-eligible route — every other
// request (API calls, every other page, static assets) is untouched
// and goes straight to the network exactly as it did before this SW
// existed.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;

  const url = new URL(event.request.url);
  if (!OFFLINE_ELIGIBLE_PATTERN.test(url.pathname)) return;

  event.respondWith(
    fetch(event.request).catch(() => caches.open(OFFLINE_CACHE).then((cache) => cache.match(OFFLINE_URL)))
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || "LifeOS";
  const options = {
    body: data.body || "",
    icon: "/icons/app-icon-512.png",
    badge: "/icons/app-icon-512.png",
    data: { url: data.url || "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
