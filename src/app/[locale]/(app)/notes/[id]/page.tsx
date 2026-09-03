import { notFound } from "next/navigation";
import { getNote } from "@/services/core/notes";
import { listProjects } from "@/services/core/projects";
import { listGoals } from "@/services/core/goals";
import { listBusinesses } from "@/services/core/businesses";
import { NoteReadingView } from "@/components/planning/note-reading-view";

// Notes Reading Experience spec: a dedicated reading view, not the same
// compact card/textarea used elsewhere — a real route (not a modal) so
// refreshing mid-read, using the browser back button, and deep-linking
// all behave naturally. getNote() is RLS-scoped (notes_all_own), so a
// note belonging to another user resolves to null exactly like a
// nonexistent one — both correctly 404, never leaking whether the id
// exists for someone else.
export const dynamic = "force-dynamic";

export default async function NoteReadingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [note, projects, goals, businesses] = await Promise.all([getNote(id), listProjects(), listGoals(), listBusinesses()]);

  if (!note) notFound();

  return <NoteReadingView note={note} projects={projects} goals={goals} businesses={businesses} />;
}
