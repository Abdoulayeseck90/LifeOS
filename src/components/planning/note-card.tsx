"use client";

import { useTranslations } from "next-intl";
import { Pin } from "lucide-react";
import type { OfflineNote } from "@/lib/offline/db";
import { Link } from "@/lib/i18n/navigation";
import { PendingSyncBadge } from "@/components/core/pending-sync-badge";
import { useNotePinToggle } from "@/lib/notes/use-note-pin-toggle";
import { stripMarkdownForPreview } from "@/lib/notes/strip-markdown-preview";

// Notes Reading Experience spec: the list is for finding and opening a
// note, not acting on it — Edit/Delete moved to the reading view
// (NoteReadingView, at /notes/[id], which fetches its own
// projects/goals/businesses for the Edit form), reached by opening the
// note. Pin stays here as a quick-toggle (a common list-level
// affordance, e.g. starring an email without opening it), deliberately
// understated so it never dominates visually.
export function NoteCard({ note }: { note: OfflineNote }) {
  const t = useTranslations("notes");
  const { pinning, togglePin } = useNotePinToggle(note);
  const preview = stripMarkdownForPreview(note.content);

  return (
    <div className="rounded-card border border-surface bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <Link href={`/notes/${note.id}`} className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {note.title && <p className="truncate font-medium text-secondary">{note.title}</p>}
            {note._pendingSync && <PendingSyncBadge />}
          </div>
          <p className={`text-sm text-muted ${note.title ? "mt-1 line-clamp-2" : "line-clamp-3"}`}>{preview}</p>
        </Link>
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
    </div>
  );
}
