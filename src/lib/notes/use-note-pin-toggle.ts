"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { attemptFetch } from "@/lib/offline/attempt-fetch";
import { getDB, type OfflineNote } from "@/lib/offline/db";
import { enqueue, SYNC_UPDATED_EVENT } from "@/lib/offline/sync-queue";

// Shared by NoteCard (list quick-toggle) and NoteReadingView (reading
// view action) — the same offline-aware pin/unpin behavior, written
// once instead of duplicated across both surfaces.
export function useNotePinToggle(note: OfflineNote) {
  const router = useRouter();
  const [pinning, setPinning] = useState(false);

  async function togglePin() {
    setPinning(true);
    const nextPinned = !note.pinned;
    const body = { pinned: nextPinned };

    const attempt = await attemptFetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (attempt.networkFailure) {
      const db = await getDB();
      await db.put("notes", { ...note, pinned: nextPinned, _pendingSync: true }, note.id);
      await enqueue({ feature: "note", operation: "update", entityId: note.id, payload: body });
      setPinning(false);
      window.dispatchEvent(new Event(SYNC_UPDATED_EVENT));
      return;
    }

    setPinning(false);
    router.refresh();
  }

  return { pinning, togglePin };
}
