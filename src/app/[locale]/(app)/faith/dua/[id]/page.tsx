import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getDua } from "@/services/core/duas";
import { listUserDuaRoutines } from "@/services/core/dua-routines";
import { listCompletionsForDate } from "@/services/core/dua-completions";
import { listDuaUserData } from "@/services/core/dua-user-data";
import { DuaArabicBlock } from "@/components/faith/dua-arabic-block";
import { DuaCompletionToggle } from "@/components/faith/dua-completion-toggle";
import { AddToRoutineButton } from "@/components/faith/add-to-routine-button";
import { DuaFavoriteButton } from "@/components/faith/dua-favorite-button";
import { DuaShareButton } from "@/components/faith/dua-share-button";
import { DuaNoteField } from "@/components/faith/dua-note-field";

// Section 5/23: the detail page prioritizes reading — title, Arabic,
// transliteration, translation, meaning, when to recite, source (only
// rendered when present — Section 6, never a fabricated placeholder),
// then actions.
export const dynamic = "force-dynamic";

export default async function DuaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("faith.dua");
  const tCategories = await getTranslations("faith.dua.categories");
  const tSource = await getTranslations("faith.dua.source");

  const today = new Date().toISOString().slice(0, 10);
  const [dua, routines, completions, userDataList] = await Promise.all([
    getDua(id),
    listUserDuaRoutines(),
    listCompletionsForDate(today),
    listDuaUserData(),
  ]);

  if (!dua) notFound();

  const routineItem = routines.find((r) => r.dua_id === dua.id);
  const isCompleted = routineItem ? completions.some((c) => c.routine_id === routineItem.id) : false;
  const userData = userDataList.find((d) => d.dua_id === dua.id);

  const hasSource = Boolean(dua.source_name || dua.source_reference || dua.source_url);

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{tCategories(dua.category)}</p>
      <h1 className="mt-1 text-2xl font-semibold text-secondary">{dua.title}</h1>
      {dua.is_builtin && dua.verification_status === "needs_verification" && (
        <p className="mt-1 text-xs text-status-attention">{t("needsVerification")}</p>
      )}

      <div className="mt-4">
        <DuaArabicBlock text={dua.arabic_text} />
      </div>

      {dua.transliteration && (
        <div className="mt-4">
          <p className="text-sm font-medium text-secondary">{t("transliteration")}</p>
          <p className="mt-1 text-sm text-muted">{dua.transliteration}</p>
        </div>
      )}

      {dua.translation && (
        <div className="mt-4">
          <p className="text-sm font-medium text-secondary">{t("translation")}</p>
          <p className="mt-1 text-secondary">{dua.translation}</p>
        </div>
      )}

      {dua.meaning && (
        <div className="mt-4">
          <p className="text-sm font-medium text-secondary">{t("meaning")}</p>
          <p className="mt-1 text-sm text-muted">{dua.meaning}</p>
        </div>
      )}

      {(dua.recommended_time || dua.frequency) && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {dua.recommended_time && (
            <div>
              <p className="text-sm font-medium text-secondary">{t("whenToRecite")}</p>
              <p className="mt-1 text-sm text-muted">{dua.recommended_time}</p>
            </div>
          )}
          {dua.frequency && (
            <div>
              <p className="text-sm font-medium text-secondary">{t("frequency")}</p>
              <p className="mt-1 text-sm text-muted">{dua.frequency}</p>
            </div>
          )}
        </div>
      )}

      {hasSource && (
        <div className="mt-4 rounded-card border border-surface bg-surface/40 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{tSource("title")}</p>
          {dua.source_name && <p className="mt-1 text-sm text-secondary">{dua.source_name}</p>}
          {dua.source_reference && <p className="text-xs text-muted">{dua.source_reference}</p>}
          {dua.source_url && (
            <a href={dua.source_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-primary hover:underline">
              {dua.source_url}
            </a>
          )}
        </div>
      )}

      {dua.notes && (
        <div className="mt-4">
          <p className="text-sm font-medium text-secondary">{t("notes")}</p>
          <p className="mt-1 text-sm text-muted">{dua.notes}</p>
        </div>
      )}

      <div className="mt-6">
        <DuaNoteField duaId={dua.id} initialNotes={userData?.notes ?? ""} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-surface pt-4">
        {routineItem ? (
          <DuaCompletionToggle
            routineId={routineItem.id}
            duaId={dua.id}
            completed={isCompleted}
            label={t("markComplete", { title: dua.title })}
          />
        ) : (
          <AddToRoutineButton duaId={dua.id} />
        )}
        <DuaFavoriteButton duaId={dua.id} favorited={userData?.favorited ?? false} />
        <DuaShareButton title={dua.title} text={dua.translation ?? dua.title} />
      </div>
    </div>
  );
}
