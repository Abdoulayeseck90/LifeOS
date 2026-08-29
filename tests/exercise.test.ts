import { describe, it, expect } from "vitest";
import { computeFitnessSummary, getExerciseRecommendations } from "@/lib/health/exercise";
import type { Workout } from "@/types/health/entities";

const REFERENCE_DATE = new Date("2026-08-26T12:00:00.000Z");

function daysAgoIso(days: number): string {
  return new Date(REFERENCE_DATE.getTime() - days * 86_400_000).toISOString();
}

function makeWorkout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: crypto.randomUUID(),
    user_id: "user-1",
    workout_type: "running",
    status: "completed",
    started_at: daysAgoIso(0),
    duration_minutes: null,
    distance_value: null,
    distance_unit: null,
    calories: null,
    steps: null,
    sets: null,
    reps: null,
    weight_resistance: null,
    weight_unit: null,
    notes: null,
    created_at: daysAgoIso(0),
    updated_at: daysAgoIso(0),
    ...overrides,
  };
}

describe("computeFitnessSummary", () => {
  it("only reflects real data — no workouts means no fabricated stats", () => {
    const summary = computeFitnessSummary([], REFERENCE_DATE);
    expect(summary).toEqual({ workoutCount: 0, activeMinutes: 0, distance: null, calories: null });
  });

  it("sums duration/distance/calories only within the trailing 7 days", () => {
    const workouts = [
      makeWorkout({ started_at: daysAgoIso(1), duration_minutes: 30, distance_value: 3, distance_unit: "mi", calories: 250 }),
      makeWorkout({ started_at: daysAgoIso(3), duration_minutes: 45, distance_value: 4, distance_unit: "mi", calories: 300 }),
      // Outside the trailing-7-day window — must not count.
      makeWorkout({ started_at: daysAgoIso(10), duration_minutes: 60, distance_value: 5, distance_unit: "mi", calories: 400 }),
    ];

    const summary = computeFitnessSummary(workouts, REFERENCE_DATE);
    expect(summary.workoutCount).toBe(2);
    expect(summary.activeMinutes).toBe(75);
    expect(summary.distance).toEqual({ value: 7, unit: "mi" });
    expect(summary.calories).toBe(550);
  });

  it("excludes scheduled/cancelled workouts from the summary", () => {
    const workouts = [
      makeWorkout({ started_at: daysAgoIso(1), status: "scheduled", duration_minutes: 30 }),
      makeWorkout({ started_at: daysAgoIso(1), status: "cancelled", duration_minutes: 30 }),
    ];
    expect(computeFitnessSummary(workouts, REFERENCE_DATE).workoutCount).toBe(0);
  });

  it("only sums the most-used distance unit, never mixing units together", () => {
    const workouts = [
      makeWorkout({ started_at: daysAgoIso(1), distance_value: 3, distance_unit: "mi" }),
      makeWorkout({ started_at: daysAgoIso(2), distance_value: 5, distance_unit: "mi" }),
      makeWorkout({ started_at: daysAgoIso(3), distance_value: 10, distance_unit: "km" }),
    ];
    const summary = computeFitnessSummary(workouts, REFERENCE_DATE);
    // "mi" has 2 entries vs "km"'s 1 — mi wins, km is not folded in.
    expect(summary.distance).toEqual({ value: 8, unit: "mi" });
  });
});

describe("getExerciseRecommendations", () => {
  it("suggests a walk when nothing has been logged this week", () => {
    const recs = getExerciseRecommendations([], REFERENCE_DATE);
    expect(recs.map((r) => r.key)).toContain("tryWalkToday");
  });

  it("does not suggest a walk when a workout already happened this week", () => {
    const workouts = [makeWorkout({ started_at: daysAgoIso(1) })];
    const recs = getExerciseRecommendations(workouts, REFERENCE_DATE);
    expect(recs.map((r) => r.key)).not.toContain("tryWalkToday");
  });

  it("flags a recovery day after 4+ consecutive days of training", () => {
    const workouts = [0, 1, 2, 3].map((d) => makeWorkout({ started_at: daysAgoIso(d) }));
    const recs = getExerciseRecommendations(workouts, REFERENCE_DATE);
    expect(recs.map((r) => r.key)).toContain("considerRecoveryDay");
  });

  it("does not flag a recovery day for a short streak", () => {
    const workouts = [0, 1].map((d) => makeWorkout({ started_at: daysAgoIso(d) }));
    const recs = getExerciseRecommendations(workouts, REFERENCE_DATE);
    expect(recs.map((r) => r.key)).not.toContain("considerRecoveryDay");
  });

  it("flags fewer-than-usual only when this week is genuinely below a real recent baseline", () => {
    // 3 workouts/week for the 4 prior weeks, only 1 this week.
    const priorWeeks = [1, 2, 3, 4].flatMap((week) => [0, 1, 2].map((i) => makeWorkout({ started_at: daysAgoIso(week * 7 + i) })));
    const thisWeek = [makeWorkout({ started_at: daysAgoIso(1) })];
    const recs = getExerciseRecommendations([...thisWeek, ...priorWeeks], REFERENCE_DATE);
    expect(recs.map((r) => r.key)).toContain("fewerWorkoutsThanUsual");
  });

  it("never flags fewer-than-usual without any prior history to compare against", () => {
    const workouts = [makeWorkout({ started_at: daysAgoIso(1) })];
    const recs = getExerciseRecommendations(workouts, REFERENCE_DATE);
    expect(recs.map((r) => r.key)).not.toContain("fewerWorkoutsThanUsual");
  });
});
