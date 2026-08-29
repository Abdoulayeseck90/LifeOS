import { getTranslations } from "next-intl/server";
import { listUserDuaRoutines } from "@/services/core/dua-routines";
import { listCompletionsInRange } from "@/services/core/dua-completions";
import { computeStreak } from "@/lib/faith/streak";
import { InfoCard } from "@/components/core/info-card";
import { CalendarDays } from "lucide-react";

// Section 12/13: Today/Yesterday/This Week/This Month + a subtle streak
// — never the central feature, never shame-based (Section 32). Rate per
// historical day is computed against today's CURRENT routine size (a
// documented simplification — reconstructing exactly how many items
// were scheduled on a past day would need routine-membership
// snapshotting, out of scope for this pass).
export const dynamic = "force-dynamic";

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function DuaHistoryPage() {
  const t = await getTranslations("faith.dua.history");
  const now = new Date();
  const rangeStart = new Date(now.getTime() - 90 * 86_400_000);

  const [routines, completions] = await Promise.all([
    listUserDuaRoutines(),
    listCompletionsInRange(toDateStr(rangeStart), toDateStr(now)),
  ]);

  const totalCount = routines.length;

  const countByDate = new Map<string, number>();
  for (const completion of completions) {
    countByDate.set(completion.completed_date, (countByDate.get(completion.completed_date) ?? 0) + 1);
  }

  function rateFor(date: string): number {
    if (totalCount === 0) return 0;
    return (countByDate.get(date) ?? 0) / totalCount;
  }

  const todayStr = toDateStr(now);
  const yesterdayStr = toDateStr(new Date(now.getTime() - 86_400_000));

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  function statsSince(start: Date): { completed: number; rate: number } {
    let completed = 0;
    let days = 0;
    for (const d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
      completed += countByDate.get(toDateStr(d)) ?? 0;
      days += 1;
    }
    const possible = totalCount * days;
    return { completed, rate: possible > 0 ? completed / possible : 0 };
  }

  const dailyRates: { date: string; rate: number }[] = [];
  for (const d = new Date(rangeStart); d <= now; d.setDate(d.getDate() + 1)) {
    dailyRates.push({ date: toDateStr(d), rate: rateFor(toDateStr(d)) });
  }
  const streak = computeStreak(dailyRates);

  const weekStats = statsSince(weekStart);
  const monthStats = statsSince(monthStart);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-secondary">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
      </div>

      {totalCount === 0 ? (
        <p className="text-sm text-muted">{t("noRoutine")}</p>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoCard icon={CalendarDays} label={t("today")}>
              <p className="text-2xl font-semibold text-secondary">
                {countByDate.get(todayStr) ?? 0} / {totalCount}
              </p>
            </InfoCard>
            <InfoCard icon={CalendarDays} label={t("yesterday")}>
              <p className="text-2xl font-semibold text-secondary">
                {countByDate.get(yesterdayStr) ?? 0} / {totalCount}
              </p>
            </InfoCard>
            <InfoCard icon={CalendarDays} label={t("thisWeek")}>
              <p className="text-2xl font-semibold text-secondary">{Math.round(weekStats.rate * 100)}%</p>
            </InfoCard>
            <InfoCard icon={CalendarDays} label={t("thisMonth")}>
              <p className="text-2xl font-semibold text-secondary">{Math.round(monthStats.rate * 100)}%</p>
            </InfoCard>
          </div>

          <p className="text-sm text-muted">{t("streak", { days: streak.current })}</p>
          <p className="mt-1 text-xs text-muted">{t("bestStreak", { days: streak.best })}</p>
        </>
      )}
    </div>
  );
}
