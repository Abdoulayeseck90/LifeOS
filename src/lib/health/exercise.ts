import type { Workout } from "@/types/health/entities";

// Pure, client-safe fitness math — kept out of services/health/workouts.ts
// (server-only Supabase import) for the same reason as lib/health/
// lab-level.ts and lib/health/blood-pressure.ts. "This week" is a
// trailing-7-day window (not a Mon–Sun calendar week) to avoid locale
// week-start ambiguity, matching the simple day-math style already used
// elsewhere in this app (e.g. dashboard's daysUntil helper).

const DAY_MS = 86_400_000;

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / DAY_MS);
}

function isCompleted(w: Workout): boolean {
  return w.status === "completed";
}

export interface FitnessSummary {
  workoutCount: number;
  activeMinutes: number;
  distance: { value: number; unit: string } | null;
  calories: number | null;
}

// Only ever reflects real logged data — no fabricated/estimated values
// (spec: "Only show metrics that actually exist... Do not create fake
// values"). Distance is only summed within its single most-used unit
// (mixed mi/km entries aren't silently added together without
// conversion) so the total is never misleading.
export function computeFitnessSummary(workouts: Workout[], now: Date): FitnessSummary {
  const thisWeek = workouts.filter((w) => isCompleted(w) && daysBetween(now, new Date(w.started_at)) < 7 && daysBetween(now, new Date(w.started_at)) >= 0);

  const activeMinutes = thisWeek.reduce((sum, w) => sum + (w.duration_minutes ?? 0), 0);

  const sumByUnit = new Map<string, number>();
  const countByUnit = new Map<string, number>();
  for (const w of thisWeek) {
    if (w.distance_value === null || !w.distance_unit) continue;
    sumByUnit.set(w.distance_unit, (sumByUnit.get(w.distance_unit) ?? 0) + w.distance_value);
    countByUnit.set(w.distance_unit, (countByUnit.get(w.distance_unit) ?? 0) + 1);
  }
  let distance: FitnessSummary["distance"] = null;
  // "Most-used" = most frequently logged unit (not largest total) —
  // a single long run in km shouldn't outrank five runs in mi.
  const topUnitEntry = [...countByUnit.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topUnitEntry) {
    const [unit] = topUnitEntry;
    distance = { value: sumByUnit.get(unit) as number, unit };
  }

  const totalCalories = thisWeek.reduce((sum, w) => sum + (w.calories ?? 0), 0);
  const calories = totalCalories > 0 ? totalCalories : null;

  return { workoutCount: thisWeek.length, activeMinutes, distance, calories };
}

export type ExerciseRecommendationKey = "tryWalkToday" | "fewerWorkoutsThanUsual" | "considerRecoveryDay";

export interface ExerciseRecommendation {
  key: ExerciseRecommendationKey;
  params?: Record<string, number>;
}

const RECOVERY_DAY_STREAK_THRESHOLD = 4;
const BASELINE_WEEKS = 4;

// General-wellness, rule-based, deterministic — explicitly NOT medical
// advice or a diagnosis (spec Section 11). Every recommendation is
// phrased with "Consider..." at the call site (next-intl message
// strings), never "You need to...". At most one of each rule fires, and
// the caller may cap the total shown.
export function getExerciseRecommendations(workouts: Workout[], now: Date): ExerciseRecommendation[] {
  const completed = workouts.filter(isCompleted);
  const recommendations: ExerciseRecommendation[] = [];

  const thisWeekCount = completed.filter((w) => {
    const d = daysBetween(now, new Date(w.started_at));
    return d >= 0 && d < 7;
  }).length;

  if (thisWeekCount === 0) {
    recommendations.push({ key: "tryWalkToday" });
  }

  // Baseline: average weekly count over the 4 weeks before this one —
  // only compared when there's enough history to mean anything.
  const priorWeekCounts: number[] = [];
  for (let week = 1; week <= BASELINE_WEEKS; week++) {
    const count = completed.filter((w) => {
      const d = daysBetween(now, new Date(w.started_at));
      return d >= week * 7 && d < (week + 1) * 7;
    }).length;
    priorWeekCounts.push(count);
  }
  const baselineAverage = priorWeekCounts.reduce((a, b) => a + b, 0) / priorWeekCounts.length;
  if (baselineAverage >= 1 && thisWeekCount < baselineAverage && thisWeekCount > 0) {
    recommendations.push({ key: "fewerWorkoutsThanUsual" });
  }

  // Consecutive-day streak ending today/yesterday, so a stale streak
  // from weeks ago doesn't keep suggesting a recovery day.
  const daysWithWorkout = new Set(completed.map((w) => new Date(w.started_at).toDateString()));
  let streak = 0;
  const MAX_STREAK_LOOKBACK_DAYS = 90;
  for (let d = 0; d < MAX_STREAK_LOOKBACK_DAYS; d++) {
    const day = new Date(now.getTime() - d * DAY_MS);
    if (daysWithWorkout.has(day.toDateString())) {
      streak++;
    } else if (d === 0) {
      continue; // today having no workout yet shouldn't break a streak ending yesterday
    } else {
      break;
    }
  }
  if (streak >= RECOVERY_DAY_STREAK_THRESHOLD) {
    recommendations.push({ key: "considerRecoveryDay" });
  }

  return recommendations;
}
