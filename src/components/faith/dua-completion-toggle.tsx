"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { attemptFetch } from "@/lib/offline/attempt-fetch";
import { togglePendingCompletion } from "@/lib/offline/dua-cache";
import { enqueue, SYNC_UPDATED_EVENT } from "@/lib/offline/sync-queue";

// Section 10: a real two-way toggle (☐ / ☑), not a one-way "complete"
// action — tapping an already-completed item un-completes it. Section
// 32: no shame-based styling on a miss, this is just a plain circle.
export function DuaCompletionToggle({
  routineId,
  duaId,
  completed,
  label,
}: {
  routineId: string;
  duaId: string;
  completed: boolean;
  label: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleToggle() {
    setPending(true);
    const body = { routine_id: routineId, dua_id: duaId };

    const attempt = await attemptFetch("/api/faith/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (attempt.networkFailure) {
      await togglePendingCompletion(routineId);
      await enqueue({ feature: "dua_completion", operation: "update", entityId: routineId, payload: body });
      setPending(false);
      window.dispatchEvent(new Event(SYNC_UPDATED_EVENT));
      return;
    }

    setPending(false);
    if (attempt.response.ok) router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={pending}
      aria-pressed={completed}
      aria-label={label}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors disabled:opacity-50 ${
        completed ? "border-primary bg-primary text-primary-foreground" : "border-surface text-transparent hover:border-primary"
      }`}
    >
      <Check size={16} />
    </button>
  );
}
