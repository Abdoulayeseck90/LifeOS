"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Business, Goal, Note, Project } from "@/types/core/entities";
import { NoteCard } from "@/components/planning/note-card";
import { useOfflineList } from "@/lib/offline/use-offline-list";
import type { OfflineNote } from "@/lib/offline/db";

// Notes spec, Section 33/36: search over title/content/tags,
// client-side over the already-fetched list (same pattern as
// vital-history.tsx), pinned notes shown first.
export function NotesList({
  notes,
  projects,
  goals,
  businesses,
}: {
  notes: Note[];
  projects: Project[];
  goals: Goal[];
  businesses: Business[];
}) {
  const t = useTranslations("notes");
  const tOffline = useTranslations("common.offline");
  const [query, setQuery] = useState("");
  const { items: mergedNotes, isOffline } = useOfflineList<OfflineNote>("notes", notes);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mergedNotes;
    return mergedNotes.filter((n) => {
      const haystack = [n.title ?? "", n.content, ...n.tags].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [mergedNotes, query]);

  const pinned = filtered.filter((n) => n.pinned);
  const recent = filtered.filter((n) => !n.pinned);

  return (
    <div>
      {isOffline && <p className="mb-4 rounded bg-status-attention/10 px-3 py-2 text-xs text-status-attention">{tOffline("showingCached")}</p>}

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        className="mb-6 w-full rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm text-secondary sm:max-w-sm"
      />

      {filtered.length === 0 ? (
        <div className="rounded-card border border-dashed border-surface p-8 text-center">
          <p className="text-sm text-muted">{query ? t("noResults") : t("emptyMessage")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {pinned.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t("pinnedNotes")}</h2>
              <div className="flex flex-col gap-3">
                {pinned.map((n) => (
                  <NoteCard key={n.id} note={n} projects={projects} goals={goals} businesses={businesses} />
                ))}
              </div>
            </section>
          )}

          {recent.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t("recentNotes")}</h2>
              <div className="flex flex-col gap-3">
                {recent.map((n) => (
                  <NoteCard key={n.id} note={n} projects={projects} goals={goals} businesses={businesses} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
