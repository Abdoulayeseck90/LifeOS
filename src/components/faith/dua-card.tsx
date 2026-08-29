"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import type { Dua } from "@/types/core/entities";
import { DuaCompletionToggle } from "@/components/faith/dua-completion-toggle";

// Section 22: category, title, short preview, recommended time,
// completion state — kept visually calm, never text-heavy (Section 32).
export function DuaCard({
  dua,
  routineItem,
}: {
  dua: Dua;
  routineItem?: { id: string; completed: boolean };
}) {
  const t = useTranslations("faith.dua");
  const tCategories = useTranslations("faith.dua.categories");
  const router = useRouter();

  const preview = dua.arabic_text || dua.translation || dua.meaning || "";

  async function handleRemove() {
    if (!routineItem) return;
    const response = await fetch(`/api/faith/routines/${routineItem.id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  }

  return (
    <div className="flex items-center gap-3 rounded-card border border-surface bg-white p-4">
      {routineItem && (
        <DuaCompletionToggle
          routineId={routineItem.id}
          duaId={dua.id}
          completed={routineItem.completed}
          label={t("markComplete", { title: dua.title })}
        />
      )}

      <Link href={`/faith/dua/${dua.id}`} className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{tCategories(dua.category)}</p>
        <p className="truncate font-medium text-secondary">{dua.title}</p>
        {preview && <p className="truncate text-sm text-muted">{preview}</p>}
        {dua.recommended_time && <p className="mt-0.5 text-xs text-muted">{dua.recommended_time}</p>}
      </Link>

      {routineItem && (
        <button type="button" onClick={handleRemove} className="shrink-0 text-xs text-status-urgent hover:underline">
          {t("removeFromRoutine")}
        </button>
      )}
    </div>
  );
}
