"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Pencil, Pin, Trash2 } from "lucide-react";
import type { Business, Goal, Note, Project } from "@/types/core/entities";
import { Link } from "@/lib/i18n/navigation";
import { NoteContent } from "@/components/planning/note-content";
import { NoteForm } from "@/components/planning/note-form";
import { RecordFormModal } from "@/components/core/record-form-modal";
import { ConfirmDialog } from "@/components/core/confirm-dialog";
import { PendingSyncBadge } from "@/components/core/pending-sync-badge";
import { useNotePinToggle } from "@/lib/notes/use-note-pin-toggle";

// Notes Reading Experience spec: "Notes list -> Open note -> Clean
// reading view -> [Edit]" — Edit reuses the exact same NoteForm/
// RecordFormModal drawer the list already uses (nothing duplicated),
// and since this page's own URL doesn't change across a save,
// router.refresh() naturally lands back on the reading view with the
// updated content — no separate "return to reading view" wiring needed.
export function NoteReadingView({
  note,
  projects,
  goals,
  businesses,
}: {
  note: Note & { _pendingSync?: boolean };
  projects: Project[];
  goals: Goal[];
  businesses: Business[];
}) {
  const t = useTranslations("notes");
  const tCommon = useTranslations("common");
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const { pinning, togglePin } = useNotePinToggle(note);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const response = await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
    setDeleting(false);
    if (response.ok) router.push("/notes");
  }

  const updatedLabel = new Date(note.updated_at).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/notes" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary">
        <ArrowLeft size={16} />
        {t("title")}
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-surface pb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-secondary sm:text-3xl">{note.title || t("untitled")}</h1>
            {note._pendingSync && <PendingSyncBadge />}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            {note.related_domain && <span>{t(`form.categories.${note.related_domain}`)}</span>}
            {note.related_domain && <span aria-hidden="true">•</span>}
            <span>{t("updatedOn", { date: updatedLabel })}</span>
          </div>
          {note.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {note.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-surface bg-surface/50 px-2 py-0.5 text-xs text-secondary">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={togglePin}
            disabled={pinning}
            aria-pressed={note.pinned}
            aria-label={note.pinned ? t("unpin") : t("pin")}
            className={`flex h-11 w-11 items-center justify-center rounded hover:bg-surface ${note.pinned ? "text-primary" : "text-muted"}`}
          >
            <Pin size={18} fill={note.pinned ? "currentColor" : "none"} />
          </button>

          <RecordFormModal
            trigger={(open) => (
              <button type="button" onClick={open} aria-label={tCommon("edit")} className="flex h-11 w-11 items-center justify-center rounded text-muted hover:bg-surface hover:text-primary">
                <Pencil size={18} />
              </button>
            )}
            modalTitle={t("editTitle")}
            variant="drawer"
          >
            {(modalProps) => <NoteForm note={note} projects={projects} goals={goals} businesses={businesses} {...modalProps} />}
          </RecordFormModal>

          <ConfirmDialog
            trigger={(open) => (
              <button
                type="button"
                onClick={open}
                disabled={deleting}
                aria-label={tCommon("delete")}
                className="flex h-11 w-11 items-center justify-center rounded text-status-urgent hover:bg-status-urgent/10"
              >
                <Trash2 size={18} />
              </button>
            )}
            title={t("deleteConfirmTitle")}
            description={t("deleteConfirmMessage")}
            onConfirm={handleDelete}
          />
        </div>
      </div>

      <NoteContent content={note.content} />
    </div>
  );
}
