"use client";

import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Workout, WorkoutType } from "@/types/health/entities";
import { WorkoutCard } from "@/components/health/workout-card";
import { DateRangeFilter } from "@/components/core/date-range-filter";

const WORKOUT_TYPE_ORDER: WorkoutType[] = ["walking", "running", "cycling", "strength", "other"];

function dateKey(iso: string): string {
  return new Date(iso).toDateString();
}

// Groups the already-fetched, already-sorted (desc) list into day
// buckets labeled "Today"/"Yesterday"/an explicit date — Spec Section 9's
// example layout. Filter chips only ever show types the user actually
// has data for (Spec: "Do not add filters that have no meaningful data").
export function WorkoutHistory({ workouts }: { workouts: Workout[] }) {
  const t = useTranslations("exercise");
  const { locale } = useParams<{ locale: string }>();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<WorkoutType | "all">("all");

  // Date range applies only to this history list, not to FitnessSummary/
  // ExerciseRecommendations (siblings on the page fed by the same,
  // unfiltered `workouts` prop) — those need the complete history to
  // compute "this week"/rolling-baseline stats correctly regardless of
  // what the user is currently browsing.
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const availableTypes = useMemo(() => {
    const present = new Set(workouts.map((w) => w.workout_type));
    return WORKOUT_TYPE_ORDER.filter((type) => present.has(type));
  }, [workouts]);

  const dateFiltered = useMemo(() => {
    if (!from && !to) return workouts;
    return workouts.filter((w) => {
      const day = w.started_at.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      return true;
    });
  }, [workouts, from, to]);

  const filtered = filter === "all" ? dateFiltered : dateFiltered.filter((w) => w.workout_type === filter);

  const groups = useMemo(() => {
    const today = dateKey(new Date().toISOString());
    const yesterday = dateKey(new Date(Date.now() - 86_400_000).toISOString());

    const map = new Map<string, Workout[]>();
    for (const workout of filtered) {
      const key = dateKey(workout.started_at);
      const list = map.get(key);
      if (list) list.push(workout);
      else map.set(key, [workout]);
    }

    return [...map.entries()].map(([key, items]) => {
      let label: string;
      if (key === today) label = t("today");
      else if (key === yesterday) label = t("yesterday");
      else label = new Date(key).toLocaleDateString(locale, { month: "long", day: "numeric" });
      return { key, label, items };
    });
  }, [filtered, locale, t]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("historyTitle")}</h2>
      </div>

      <DateRangeFilter quickRanges={["30d", "3m", "6m", "thisYear", "custom"]} />

      {availableTypes.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`inline-flex min-h-11 items-center rounded-full border px-3 text-xs font-medium ${
              filter === "all" ? "border-primary bg-primary text-primary-foreground" : "border-surface text-secondary hover:bg-surface"
            }`}
          >
            {t("filterAll")}
          </button>
          {availableTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilter(type)}
              className={`inline-flex min-h-11 items-center rounded-full border px-3 text-xs font-medium ${
                filter === type ? "border-primary bg-primary text-primary-foreground" : "border-surface text-secondary hover:bg-surface"
              }`}
            >
              {t(`workoutTypeOptions.${type}`)}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-card border border-dashed border-surface p-8 text-center">
          <p className="text-sm text-muted">{workouts.length === 0 ? t("empty") : t("noFilterResults")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <div key={group.key}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{group.label}</p>
              <div className="flex flex-col gap-3">
                {group.items.map((workout) => (
                  <WorkoutCard key={workout.id} workout={workout} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
