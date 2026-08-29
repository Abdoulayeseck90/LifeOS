"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Footprints, Bike, Dumbbell, Activity, type LucideIcon } from "lucide-react";
import type { Workout, WorkoutType } from "@/types/health/entities";
import { WorkoutForm } from "@/components/health/workout-form";
import { RecordFormModal } from "@/components/core/record-form-modal";
import { ConfirmDialog } from "@/components/core/confirm-dialog";

export const WORKOUT_TYPE_ICON: Record<WorkoutType, LucideIcon> = {
  walking: Footprints,
  running: Footprints,
  cycling: Bike,
  strength: Dumbbell,
  other: Activity,
};

export function WorkoutCard({ workout }: { workout: Workout }) {
  const t = useTranslations("exercise");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const Icon = WORKOUT_TYPE_ICON[workout.workout_type];

  async function handleDelete() {
    const response = await fetch(`/api/health/workouts/${workout.id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  }

  const details: string[] = [];
  if (workout.duration_minutes) details.push(t("durationValue", { count: workout.duration_minutes }));
  if (workout.distance_value) details.push(`${workout.distance_value} ${workout.distance_unit}`);
  if (workout.steps) details.push(t("stepsValue", { count: workout.steps }));
  if (workout.sets && workout.reps) details.push(t("setsRepsValue", { sets: workout.sets, reps: workout.reps }));
  if (workout.weight_resistance) details.push(`${workout.weight_resistance} ${workout.weight_unit}`);
  if (workout.calories) details.push(t("caloriesValue", { count: workout.calories }));

  return (
    <div className="flex items-center justify-between gap-4 rounded-card border border-surface bg-white p-4">
      <div className="flex items-start gap-3">
        <Icon size={18} className="mt-0.5 shrink-0 text-primary" />
        <div>
          <p className="font-medium text-secondary">{t(`workoutTypeOptions.${workout.workout_type}`)}</p>
          {details.length > 0 && <p className="mt-0.5 text-sm text-muted">{details.join(" · ")}</p>}
          {workout.notes && <p className="mt-1 text-sm text-secondary">{workout.notes}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <RecordFormModal
          trigger={(open) => (
            <button type="button" onClick={open} className="inline-flex min-h-11 items-center text-xs text-primary hover:underline">
              {tCommon("edit")}
            </button>
          )}
          modalTitle={t("form.editTitle")}
        >
          {(modalProps) => <WorkoutForm workout={workout} {...modalProps} />}
        </RecordFormModal>
        <ConfirmDialog
          trigger={(open) => (
            <button
              type="button"
              onClick={open}
              className="inline-flex min-h-11 items-center text-xs text-status-urgent hover:underline"
            >
              {tCommon("delete")}
            </button>
          )}
          title={t("deleteConfirmTitle")}
          description={t("deleteConfirmMessage")}
          onConfirm={handleDelete}
        />
      </div>
    </div>
  );
}
