"use client";

import { useCallback, useEffect, useState } from "react";
import { getDB } from "@/lib/offline/db";
import { SYNC_UPDATED_EVENT } from "@/lib/offline/sync-queue";
import { useOnlineStatus } from "@/lib/offline/use-online-status";

type WithId = { id: string; _pendingSync?: boolean };

// Shared by NotesList and TasksList: caches whatever the server just
// returned into IndexedDB (so it's readable if the connection drops
// later in this session), then merges in any locally-pending records —
// offline-created items not yet in the server list, and offline edits
// overriding the server's stale copy of an existing item. Re-runs on
// every SYNC_UPDATED_EVENT so a completed sync (or a new offline
// mutation) is reflected immediately, without a router.refresh().
export function useOfflineList<T extends WithId>(storeName: "notes" | "tasks", serverItems: T[]): { items: T[]; isOffline: boolean } {
  const online = useOnlineStatus();
  const [items, setItems] = useState<T[]>(serverItems);

  const refresh = useCallback(async () => {
    try {
      const db = await getDB();
      const cached = (await db.getAll(storeName)) as unknown as T[];
      const serverIds = new Set(serverItems.map((item) => item.id));

      const merged = serverItems.map((item) => {
        const localOverride = cached.find((c) => c.id === item.id && c._pendingSync);
        return localOverride ?? item;
      });
      const offlineOnly = cached.filter((c) => c._pendingSync && !serverIds.has(c.id));

      setItems([...offlineOnly, ...merged]);
    } catch {
      setItems(serverItems);
    }
  }, [storeName, serverItems]);

  useEffect(() => {
    if (online) {
      getDB()
        .then(async (db) => {
          const tx = db.transaction(storeName, "readwrite");
          for (const item of serverItems) {
            const existing = await tx.store.get(item.id);
            if (!existing?._pendingSync) await tx.store.put(item as unknown as never, item.id);
          }
          await tx.done;
        })
        .catch(() => undefined);
    }
    refresh();
  }, [serverItems, online, refresh, storeName]);

  useEffect(() => {
    window.addEventListener(SYNC_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(SYNC_UPDATED_EVENT, refresh);
  }, [refresh]);

  return { items, isOffline: !online };
}
