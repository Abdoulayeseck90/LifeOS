"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import type { Dua, DuaCompletion, UserDuaRoutineWithDua } from "@/types/core/entities";
import { DuaCard } from "@/components/faith/dua-card";
import { ProgressBar } from "@/components/core/progress-bar";
import { SectionHeader } from "@/components/core/section-header";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import { cacheDuaRoutine, cacheDuaCompletions, getPendingToggles } from "@/lib/offline/dua-cache";
import { SYNC_UPDATED_EVENT } from "@/lib/offline/sync-queue";

const SCHEDULE_ORDER = ["morning", "evening", "before_sleep", "daily", "custom"] as const;

// Offline Strategy spec, Section 3: view the daily routine + mark
// completion offline. Effective completed state is server truth XOR a
// locally-pending toggle (src/lib/offline/dua-cache.ts) — a toggle made
// offline shows immediately without needing its own full local
// completion record, and clears once the queued toggle actually syncs.
export function DuaRoutineOverview({
  routines,
  completions,
  myDuas,
}: {
  routines: UserDuaRoutineWithDua[];
  completions: DuaCompletion[];
  myDuas: Dua[];
}) {
  const t = useTranslations("faith.dua");
  const tOffline = useTranslations("common.offline");
  const online = useOnlineStatus();
  const [pendingToggles, setPendingToggles] = useState<string[]>([]);

  const refreshPending = useCallback(() => {
    getPendingToggles()
      .then(setPendingToggles)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (online) {
      cacheDuaRoutine(routines).catch(() => undefined);
      cacheDuaCompletions(completions.map((c) => c.routine_id)).catch(() => undefined);
    }
    refreshPending();
  }, [routines, completions, online, refreshPending]);

  useEffect(() => {
    window.addEventListener(SYNC_UPDATED_EVENT, refreshPending);
    return () => window.removeEventListener(SYNC_UPDATED_EVENT, refreshPending);
  }, [refreshPending]);

  const serverCompletedIds = new Set(completions.map((c) => c.routine_id));

  function isEffectivelyCompleted(routineId: string): boolean {
    const isPending = pendingToggles.includes(routineId);
    const serverTrue = serverCompletedIds.has(routineId);
    return isPending ? !serverTrue : serverTrue;
  }

  const totalCount = routines.length;
  const completedCount = routines.filter((r) => isEffectivelyCompleted(r.id)).length;

  const bySchedule = new Map<string, UserDuaRoutineWithDua[]>();
  for (const routine of routines) {
    const list = bySchedule.get(routine.schedule_type) ?? [];
    list.push(routine);
    bySchedule.set(routine.schedule_type, list);
  }

  return (
    <>
      {!online && <p className="mb-4 rounded bg-status-attention/10 px-3 py-2 text-xs text-status-attention">{tOffline("showingCached")}</p>}

      {totalCount === 0 ? (
        <div className="mb-8 rounded-card border border-dashed border-surface p-8 text-center">
          <p className="text-sm font-medium text-secondary">{t("noRoutineTitle")}</p>
          <div className="mt-4 flex justify-center">
            <Link href="/faith/dua/explore" className="text-sm text-primary hover:underline">
              {t("exploreRecommended")}
            </Link>
          </div>
        </div>
      ) : (
        <div className="mb-8 rounded-card border border-surface bg-white p-4">
          <SectionHeader title={t("dailyDuas")} />
          <p className="text-2xl font-semibold text-secondary">
            {completedCount} / {totalCount} <span className="text-sm font-normal text-muted">{t("completedLabel")}</span>
          </p>
          <div className="mt-2">
            <ProgressBar value={completedCount} target={totalCount} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {SCHEDULE_ORDER.filter((type) => bySchedule.has(type)).map((type) => {
              const items = bySchedule.get(type) ?? [];
              const done = items.filter((item) => isEffectivelyCompleted(item.id)).length;
              return (
                <div key={type} className="rounded border border-surface p-3">
                  <p className="text-sm font-medium text-secondary">{t(`scheduleTypes.${type}`)}</p>
                  <p className="text-sm text-muted">
                    {done} / {items.length} {t("completedLabel")}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-8">
        <SectionHeader title={t("myDuas")} />
        {myDuas.length === 0 ? (
          <p className="text-sm text-muted">{t("noPersonalDuas")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {myDuas.map((dua) => {
              const routine = routines.find((r) => r.dua_id === dua.id);
              return (
                <DuaCard
                  key={dua.id}
                  dua={dua}
                  routineItem={routine ? { id: routine.id, completed: isEffectivelyCompleted(routine.id) } : undefined}
                />
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
