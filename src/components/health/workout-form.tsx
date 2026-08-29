"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Workout, WorkoutType } from "@/types/health/entities";
import type { RecordFormRenderProps } from "@/components/core/record-form-modal";
import { markWorkoutSaved } from "@/components/health/workout-saved-banner";

const DISTANCE_TYPES: WorkoutType[] = ["walking", "running", "cycling"];

function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Hosted inside RecordFormModal — see body-metric-form.tsx for the
// pattern. Field set adapts to workout_type (distance/steps for
// walking/running/cycling; sets/reps/weight for strength) rather than
// showing every field for every type — Spec Section 7/19: "only
// implement fields that fit... do not create unnecessary complexity."
export function WorkoutForm({
  workout,
  closeAfterSave,
  requestClose,
  registerDirty,
}: Partial<{ workout: Workout }> & RecordFormRenderProps) {
  const t = useTranslations("exercise.form");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [workoutType, setWorkoutType] = useState<WorkoutType>(workout?.workout_type ?? "walking");
  const [startedAt, setStartedAt] = useState(
    workout ? toDatetimeLocalValue(workout.started_at) : new Date().toISOString().slice(0, 16)
  );
  const [durationMinutes, setDurationMinutes] = useState(workout?.duration_minutes?.toString() ?? "");
  const [distanceValue, setDistanceValue] = useState(workout?.distance_value?.toString() ?? "");
  const [distanceUnit, setDistanceUnit] = useState(workout?.distance_unit ?? "mi");
  const [steps, setSteps] = useState(workout?.steps?.toString() ?? "");
  const [sets, setSets] = useState(workout?.sets?.toString() ?? "");
  const [reps, setReps] = useState(workout?.reps?.toString() ?? "");
  const [weightResistance, setWeightResistance] = useState(workout?.weight_resistance?.toString() ?? "");
  const [weightUnit, setWeightUnit] = useState(workout?.weight_unit ?? "lb");
  const [calories, setCalories] = useState(workout?.calories?.toString() ?? "");
  const [notes, setNotes] = useState(workout?.notes ?? "");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const showDistance = DISTANCE_TYPES.includes(workoutType);
  const showStrength = workoutType === "strength";

  const fieldValues = {
    workoutType,
    startedAt,
    durationMinutes,
    distanceValue,
    distanceUnit,
    steps,
    sets,
    reps,
    weightResistance,
    weightUnit,
    calories,
    notes,
  };
  const initialSnapshot = useRef(JSON.stringify(fieldValues));
  useEffect(() => {
    registerDirty(JSON.stringify(fieldValues) !== initialSnapshot.current);
  });

  function toOptionalInt(value: string): number | undefined {
    if (!value.trim()) return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n) : undefined;
  }
  function toOptionalNumber(value: string): number | undefined {
    if (!value.trim()) return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!startedAt) {
      setError(t("dateRequired"));
      return;
    }

    setSubmitting(true);

    const body = JSON.stringify({
      workout_type: workoutType,
      started_at: new Date(startedAt).toISOString(),
      duration_minutes: toOptionalInt(durationMinutes),
      distance_value: showDistance ? toOptionalNumber(distanceValue) : undefined,
      distance_unit: showDistance && distanceValue.trim() ? distanceUnit : undefined,
      steps: showDistance ? toOptionalInt(steps) : undefined,
      sets: showStrength ? toOptionalInt(sets) : undefined,
      reps: showStrength ? toOptionalInt(reps) : undefined,
      weight_resistance: showStrength ? toOptionalNumber(weightResistance) : undefined,
      weight_unit: showStrength && weightResistance.trim() ? weightUnit : undefined,
      calories: toOptionalNumber(calories),
      notes: notes.trim() || undefined,
    });

    const response = workout
      ? await fetch(`/api/health/workouts/${workout.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body,
        })
      : await fetch("/api/health/workouts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });

    setSubmitting(false);

    if (!response.ok) {
      setError(t("saveError"));
      return;
    }

    registerDirty(false);
    markWorkoutSaved();
    closeAfterSave();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <p className="text-sm text-status-urgent">{error}</p>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("workoutType")}
          <select
            value={workoutType}
            onChange={(e) => setWorkoutType(e.target.value as WorkoutType)}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          >
            <option value="walking">{t("workoutTypeOptions.walking")}</option>
            <option value="running">{t("workoutTypeOptions.running")}</option>
            <option value="cycling">{t("workoutTypeOptions.cycling")}</option>
            <option value="strength">{t("workoutTypeOptions.strength")}</option>
            <option value="other">{t("workoutTypeOptions.other")}</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("startedAt")}
          <input
            type="datetime-local"
            required
            value={startedAt}
            onChange={(e) => setStartedAt(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("duration")}
          <input
            type="number"
            min="0"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          />
        </label>
      </div>

      {showDistance && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("distance")}
            <input
              type="number"
              step="any"
              min="0"
              value={distanceValue}
              onChange={(e) => setDistanceValue(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("distanceUnit")}
            <select
              value={distanceUnit}
              onChange={(e) => setDistanceUnit(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            >
              <option value="mi">{t("distanceUnitOptions.mi")}</option>
              <option value="km">{t("distanceUnitOptions.km")}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("steps")}
            <input
              type="number"
              min="0"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
        </div>
      )}

      {showStrength && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("sets")}
            <input
              type="number"
              min="0"
              value={sets}
              onChange={(e) => setSets(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("reps")}
            <input
              type="number"
              min="0"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("weightResistance")}
            <input
              type="number"
              step="any"
              min="0"
              value={weightResistance}
              onChange={(e) => setWeightResistance(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("weightUnit")}
            <select
              value={weightUnit}
              onChange={(e) => setWeightUnit(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            >
              <option value="lb">{t("weightUnitOptions.lb")}</option>
              <option value="kg">{t("weightUnitOptions.kg")}</option>
            </select>
          </label>
        </div>
      )}

      <button type="button" onClick={() => setExpanded((v) => !v)} className="w-fit text-sm text-primary hover:underline">
        {expanded ? t("fewerDetails") : t("moreDetails")}
      </button>

      {expanded && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("calories")}
            <input
              type="number"
              min="0"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("notes")}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
            />
          </label>
        </div>
      )}

      <div className="mt-2 flex justify-end gap-2">
        <button type="button" onClick={requestClose} className="rounded border border-surface px-4 py-2 text-sm text-secondary">
          {tCommon("cancel")}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {tCommon("save")}
        </button>
      </div>
    </form>
  );
}
