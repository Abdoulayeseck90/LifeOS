import { getTranslations } from "next-intl/server";
import { listNotes } from "@/services/core/notes";
import { listProjects } from "@/services/core/projects";
import { listGoals } from "@/services/core/goals";
import { listBusinesses } from "@/services/core/businesses";
import { NoteAddButton } from "@/components/planning/note-add-button";
import { NotesList } from "@/components/planning/notes-list";

// Notes spec, Section 32/33: a simple supporting utility, not a
// project-management app — search + pinned + recent, nothing more.
export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const t = await getTranslations("notes");
  const [notes, projects, goals, businesses] = await Promise.all([listNotes(), listProjects(), listGoals(), listBusinesses()]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-secondary">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </div>
        <NoteAddButton projects={projects} goals={goals} businesses={businesses} />
      </div>

      <NotesList notes={notes} projects={projects} goals={goals} businesses={businesses} />
    </div>
  );
}
