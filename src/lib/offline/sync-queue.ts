import { getDB } from "@/lib/offline/db";
import type { SyncFeature, SyncOperation, SyncQueueEntry } from "@/lib/offline/db";
import { clearPendingToggle } from "@/lib/offline/dua-cache";

// Dispatched after any drain attempt that changed at least one record —
// offline-aware components listen for this to re-read IndexedDB and
// router.refresh() instead of polling.
export const SYNC_UPDATED_EVENT = "lifeos-sync-updated";

export async function enqueue(input: {
  feature: SyncFeature;
  operation: SyncOperation;
  entityId: string;
  payload: Record<string, unknown>;
}): Promise<SyncQueueEntry> {
  const db = await getDB();
  const entry: SyncQueueEntry = {
    id: crypto.randomUUID(),
    feature: input.feature,
    operation: input.operation,
    entityId: input.entityId,
    payload: input.payload,
    createdAt: new Date().toISOString(),
    status: "pending",
  };
  await db.put("sync_queue", entry);
  return entry;
}

const API_PATH: Record<SyncFeature, string> = {
  note: "/api/notes",
  task: "/api/planning/tasks",
  dua_completion: "/api/faith/completions",
  finance_entry: "/api/finance/transactions",
};

async function performRequest(entry: SyncQueueEntry, idRemap: Map<string, string>): Promise<Response> {
  const resolvedEntityId = idRemap.get(entry.entityId) ?? entry.entityId;
  const basePath = API_PATH[entry.feature];

  // Dua completions have no per-entity URL (the route infers the toggle
  // from routine_id/dua_id in the body) — every other feature is a
  // standard POST-create / PATCH-update-by-id pair.
  if (entry.feature === "dua_completion") {
    return fetch(basePath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry.payload),
    });
  }

  if (entry.operation === "create") {
    return fetch(basePath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry.payload),
    });
  }

  return fetch(`${basePath}/${resolvedEntityId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry.payload),
  });
}

// Replays queued operations oldest-first. A create's server-assigned id
// is remembered in `idRemap` for the rest of THIS pass, so a same-session
// edit made offline right after a create (before ever reconnecting) still
// lands on the right record once its create has already synced earlier
// in the same drain — without persisting any cross-record remapping
// machinery beyond one in-memory pass (Section: "do not implement
// complex... synchronization where unnecessary").
export async function drainQueue(): Promise<void> {
  if (!navigator.onLine) return;

  const db = await getDB();
  const pending = await db.getAllFromIndex("sync_queue", "by-status", "pending");
  if (pending.length === 0) return;

  pending.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const idRemap = new Map<string, string>();
  let changed = false;

  for (const entry of pending) {
    await db.put("sync_queue", { ...entry, status: "syncing" });

    let response: Response;
    try {
      response = await performRequest(entry, idRemap);
    } catch {
      // Network-level failure — we went offline again mid-drain. Leave
      // this and everything after it pending for the next attempt.
      await db.put("sync_queue", { ...entry, status: "pending" });
      break;
    }

    if (response.ok) {
      if (entry.operation === "create") {
        const body = await response.json().catch(() => null);
        const realId = body?.data?.id;
        if (realId) {
          idRemap.set(entry.entityId, realId);
          await remapLocalRecord(entry.feature, entry.entityId, realId, body.data);
        }
      } else {
        await markLocalRecordSynced(entry.feature, idRemap.get(entry.entityId) ?? entry.entityId);
      }
      await db.delete("sync_queue", entry.id);
      changed = true;
    } else if (response.status >= 400 && response.status < 500) {
      const body = await response.json().catch(() => null);
      await db.put("sync_queue", {
        ...entry,
        status: "error",
        errorMessage: typeof body?.error === "string" ? body.error : "This change couldn't be saved.",
      });
      changed = true;
    } else {
      // Server-side failure (5xx) — transient, retry on the next drain.
      await db.put("sync_queue", { ...entry, status: "pending" });
    }
  }

  if (changed && typeof window !== "undefined") {
    window.dispatchEvent(new Event(SYNC_UPDATED_EVENT));
  }
}

async function remapLocalRecord(feature: SyncFeature, tempId: string, realId: string, serverRecord: unknown): Promise<void> {
  const db = await getDB();

  // A synced quick entry now lives in finance_transactions and will show
  // up through the normal server-rendered list — the local pending copy
  // has nothing further to do but disappear.
  if (feature === "finance_entry") {
    await db.delete("finance_quick_entries", tempId);
    return;
  }

  const storeName = feature === "note" ? "notes" : feature === "task" ? "tasks" : null;
  if (!storeName || !serverRecord) return;

  await db.delete(storeName, tempId);
  await db.put(storeName, { ...(serverRecord as object), _pendingSync: false } as never, realId);
}

async function markLocalRecordSynced(feature: SyncFeature, entityId: string): Promise<void> {
  if (feature === "dua_completion") {
    await clearPendingToggle(entityId);
    return;
  }

  const db = await getDB();
  const storeName = feature === "note" ? "notes" : feature === "task" ? "tasks" : null;
  if (!storeName) return;

  const existing = await db.get(storeName, entityId);
  if (existing) await db.put(storeName, { ...existing, _pendingSync: false }, entityId);
}

let listenersStarted = false;

// Starts the "online" listener + a 30s fallback poll while anything is
// queued (Background Sync API has no Safari support, so this plain
// listener+poll is the real baseline for this scoped pass, not a
// progressive enhancement layered on top of it). Idempotent — safe to
// call from every offline-aware component's mount effect.
export function startSyncListeners(): void {
  if (listenersStarted || typeof window === "undefined") return;
  listenersStarted = true;

  window.addEventListener("online", () => {
    drainQueue().catch(() => undefined);
  });

  setInterval(() => {
    if (navigator.onLine) drainQueue().catch(() => undefined);
  }, 30_000);
}
