import { getTranslations } from "next-intl/server";
import type { Workout } from "@/types/health/entities";
import { computeFitnessSummary } from "@/lib/health/exercise";

function formatActiveTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// "This Week" summary (Spec Section 10) — only ever shows metrics that
// exist in the user's real data (no workouts this week → no card at
// all, not a card full of zeros; see computeFitnessSummary's own
// "never fabricate a total" comment).
export async function FitnessSummary({ workouts }: { workouts: Workout[] }) {
  const t = await getTranslations("exercise.summary");
  const summary = computeFitnessSummary(workouts, new Date());

  if (summary.workoutCount === 0) {
    return null;
  }

  const stats: { label: string; value: string }[] = [
    { label: t("workouts"), value: String(summary.workoutCount) },
  ];
  if (summary.activeMinutes > 0) stats.push({ label: t("activeTime"), value: formatActiveTime(summary.activeMinutes) });
  if (summary.distance) stats.push({ label: t("distance"), value: `${summary.distance.value.toFixed(1)} ${summary.distance.unit}` });
  if (summary.calories) stats.push({ label: t("calories"), value: String(summary.calories) });

  return (
    <div className="mb-6 rounded-card border border-surface bg-white p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{t("title")}</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="text-2xl font-semibold text-secondary">{stat.value}</p>
            <p className="text-xs text-muted">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
