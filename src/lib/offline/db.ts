import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Note, TaskRecord, FinanceTransaction } from "@/types/core/entities";

// Scoped IndexedDB store, not a database for the whole app (Offline
// Strategy spec: "Do NOT build a global offline database for the entire
// application"). Exactly the 5 stores the 4 offline-eligible features
// need — nothing else gets cached or queued here.
const DB_NAME = "lifeos-offline";
const DB_VERSION = 1;

export type SyncFeature = "note" | "task" | "dua_completion" | "finance_entry";
// Delete is intentionally not a supported offline operation — none of
// the 4 features' specs ask for offline delete, only create/update
// (Tasks' "Complete" is just an update).
export type SyncOperation = "create" | "update";
export type SyncStatus = "pending" | "syncing" | "error";

export interface SyncQueueEntry {
  id: string;
  feature: SyncFeature;
  operation: SyncOperation;
  entityId: string;
  payload: Record<string, unknown>;
  createdAt: string;
  status: SyncStatus;
  errorMessage?: string;
}

export type OfflineNote = Note & { _pendingSync?: boolean };
export type OfflineTask = TaskRecord & { _pendingSync?: boolean };
export type OfflineFinanceEntry = FinanceTransaction & { _pendingSync: true };

export interface DuaCacheEntry {
  key: "routine" | "completions" | "pending_toggles";
  data: unknown;
  cachedAt: string;
}

interface LifeOSOfflineDB extends DBSchema {
  notes: { key: string; value: OfflineNote };
  tasks: { key: string; value: OfflineTask };
  dua_cache: { key: string; value: DuaCacheEntry };
  finance_quick_entries: { key: string; value: OfflineFinanceEntry };
  sync_queue: { key: string; value: SyncQueueEntry; indexes: { "by-status": string } };
}

let dbPromise: Promise<IDBPDatabase<LifeOSOfflineDB>> | null = null;

// Guarded for SSR — this module is only ever called from "use client"
// components, but importing it must not blow up during a server render.
export function getDB(): Promise<IDBPDatabase<LifeOSOfflineDB>> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available in this environment"));
  }
  if (!dbPromise) {
    dbPromise = openDB<LifeOSOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore("notes");
        db.createObjectStore("tasks");
        db.createObjectStore("dua_cache");
        db.createObjectStore("finance_quick_entries");
        const queueStore = db.createObjectStore("sync_queue", { keyPath: "id" });
        queueStore.createIndex("by-status", "status");
      },
    });
  }
  return dbPromise;
}

// Security audit finding (offline cache persists across accounts on a
// shared browser profile): called from sign-out so a second user signing
// in on the same device never sees the previous user's cached Notes/
// Tasks/Dua data or unsynced sync_queue entries. Clears every store's
// contents but keeps the database/object stores themselves, so the next
// signed-in user's online loads repopulate them exactly as on first use.
export async function clearOfflineData(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await getDB();
  await Promise.all(
    (["notes", "tasks", "dua_cache", "finance_quick_entries", "sync_queue"] as const).map((store) =>
      db.clear(store)
    )
  );
}
