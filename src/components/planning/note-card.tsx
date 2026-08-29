"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pin } from "lucide-react";
import type { Business, Goal, Project } from "@/types/core/entities";
import type { OfflineNote } from "@/lib/offline/db";
import { NoteForm } from "@/components/planning/note-form";
import { RecordFormModal } from "@/components/core/record-form-modal";
import { ConfirmDialog } from "@/components/core/confirm-dialog";
import { PendingSyncBadge } from "@/components/core/pending-sync-badge";
import { attemptFetch } from "@/lib/offline/attempt-fetch";
import { getDB } from "@/lib/offline/db";
import { enqueue, SYNC_UPDATED_EVENT } from "@/lib/offline/sync-queue";

export function NoteCard({
  note,
  projects,
  goals,
  businesses,
}: {
  note: OfflineNote;
  projects: Project[];
  goals: Goal[];
  businesses: Business[];
}) {
  const t = useTranslations("notes");
  const tCommon = useTranslations("common");
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

  async function handleDelete() {
    const response = await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  }

  return (
    <div className="rounded-card border border-surface bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {note.title && <p className="truncate font-medium text-secondary">{note.title}</p>}
            {note._pendingSync && <PendingSyncBadge />}
          </div>
          <p className={`text-sm text-muted ${note.title ? "mt-1 line-clamp-2" : "line-clamp-3"}`}>{note.content}</p>
        </div>
        <button
          type="button"
          onClick={togglePin}
          disabled={pinning}
          aria-pressed={note.pinned}
          aria-label={note.pinned ? t("unpin") : t("pin")}
          className={`shrink-0 rounded p-1.5 ${note.pinned ? "text-primary" : "text-muted hover:text-primary"}`}
        >
          <Pin size={16} fill={note.pinned ? "currentColor" : "none"} />
        </button>
      </div>

      {(note.related_domain || note.tags.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {note.related_domain && (
            <span className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-xs text-primary">
              {t(`form.categories.${note.related_domain}`)}
            </span>
          )}
          {note.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-surface bg-surface/50 px-2 py-0.5 text-xs text-secondary">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-4">
        <RecordFormModal
          trigger={(open) => (
            <button type="button" onClick={open} className="text-xs text-primary hover:underline">
              {tCommon("edit")}
            </button>
          )}
          modalTitle={t("editTitle")}
          variant="drawer"
        >
          {(modalProps) => <NoteForm note={note} projects={projects} goals={goals} businesses={businesses} {...modalProps} />}
        </RecordFormModal>
        <ConfirmDialog
          trigger={(open) => (
            <button type="button" onClick={open} className="text-xs text-status-urgent hover:underline">
              {tCommon("delete")}
            </button>
          )}
          title={t("deleteConfirmTitle")}
          description={t("deleteConfirmMessage")}
          onConfirm={handleDelete}
        />
      </div>
    </div>
  );
}
