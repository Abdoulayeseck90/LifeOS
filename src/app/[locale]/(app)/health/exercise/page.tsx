import { getTranslations } from "next-intl/server";
import { listWorkouts, listActivities, getExercisePreferences } from "@/services/health/workouts";
import { WorkoutAddButton } from "@/components/health/workout-add-button";
import { WorkoutSavedBanner } from "@/components/health/workout-saved-banner";
import { ExercisePreferencesButton } from "@/components/health/exercise-preferences-button";
import { ActivityLibrary } from "@/components/health/activity-library";
import { WorkoutHistory } from "@/components/health/workout-history";
import { ExerciseTabs } from "@/components/health/exercise-tabs";
import { ExerciseOverviewTab } from "@/components/health/exercise-overview-tab";

// Exercise & Fitness — "what did I do", deliberately separate from
// Vitals ("how is my body measuring"). Reorganized into Overview (this
// week + recommendations)/Activity Library/History tabs, same pattern
// as Nutrition and Vitals, instead of one long stacked scroll. Per-user
// data behind auth — never statically prerendered.
export const dynamic = "force-dynamic";

export default async function ExercisePage() {
  const t = await getTranslations("exercise");
  const [workouts, activities, exercisePreferences] = await Promise.all([listWorkouts(), listActivities(), getExercisePreferences()]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-secondary">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExercisePreferencesButton preferences={exercisePreferences} />
          <WorkoutAddButton />
        </div>
      </div>

      <WorkoutSavedBanner />

      <ExerciseTabs
        overview={<ExerciseOverviewTab workouts={workouts} activities={activities} preferences={exercisePreferences} />}
        library={<ActivityLibrary activities={activities} preferences={exercisePreferences} />}
        history={<WorkoutHistory workouts={workouts} />}
      />
    </div>
  );
}
