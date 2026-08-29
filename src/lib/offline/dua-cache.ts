"use client";

import { getDB } from "@/lib/offline/db";
import type { UserDuaRoutineWithDua } from "@/types/core/entities";

// Section 3 ("View daily routine offline, view cached built-in Dua
// content, mark completion offline"): the routine + today's server-
// confirmed completions are a read-only cache, refreshed on every
// online load. `pending_toggles` is the one write-side piece — routine
// ids toggled while offline, not yet confirmed by the server. The
// *effective* completed state a user sees is server truth XOR pending
// toggle, so a toggle made offline shows immediately without needing
// its own full local completion record.
export async function cacheDuaRoutine(routine: UserDuaRoutineWithDua[]): Promise<void> {
  const db = await getDB();
  await db.put("dua_cache", { key: "routine", data: routine, cachedAt: new Date().toISOString() }, "routine");
}

export async function cacheDuaCompletions(completedRoutineIds: string[]): Promise<void> {
  const db = await getDB();
  await db.put(
    "dua_cache",
    { key: "completions", data: completedRoutineIds, cachedAt: new Date().toISOString() },
    "completions"
  );
}

export async function getCachedDuaRoutine(): Promise<UserDuaRoutineWithDua[]> {
  const db = await getDB();
  const entry = await db.get("dua_cache", "routine");
  return (entry?.data as UserDuaRoutineWithDua[] | undefined) ?? [];
}

export async function getCachedDuaCompletions(): Promise<string[]> {
  const db = await getDB();
  const entry = await db.get("dua_cache", "completions");
  return (entry?.data as string[] | undefined) ?? [];
}

export async function getPendingToggles(): Promise<string[]> {
  const db = await getDB();
  const entry = await db.get("dua_cache", "pending_toggles");
  return (entry?.data as string[] | undefined) ?? [];
}

export async function togglePendingCompletion(routineId: string): Promise<void> {
  const db = await getDB();
  const current = await getPendingToggles();
  const next = current.includes(routineId) ? current.filter((id) => id !== routineId) : [...current, routineId];
  await db.put("dua_cache", { key: "pending_toggles", data: next, cachedAt: new Date().toISOString() }, "pending_toggles");
}

// Called once a queued toggle for this routine item is confirmed synced
// — clears the pending flag so effective state falls back to (now
// up-to-date) server truth.
export async function clearPendingToggle(routineId: string): Promise<void> {
  const db = await getDB();
  const current = await getPendingToggles();
  const next = current.filter((id) => id !== routineId);
  await db.put("dua_cache", { key: "pending_toggles", data: next, cachedAt: new Date().toISOString() }, "pending_toggles");
}
