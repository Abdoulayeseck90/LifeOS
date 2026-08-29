import type { Activity, ExercisePreferences, Workout } from "@/types/health/entities";
import { FitnessSummary } from "@/components/health/fitness-summary";
import { ExerciseRecommendations } from "@/components/health/exercise-recommendations";
import { EnvironmentActivitySuggestions } from "@/components/health/environment-activity-suggestions";

// Exercise redesign — Overview tab: this week's stats, rule-based
// recommendations, and environment-aware suggestions — "what did I do,
// what should I consider next," never the full library or history
// (those are their own tabs).
export function ExerciseOverviewTab({
  workouts,
  activities,
  preferences,
}: {
  workouts: Workout[];
  activities: Activity[];
  preferences: ExercisePreferences | null;
}) {
  return (
    <div>
      <FitnessSummary workouts={workouts} />
      <ExerciseRecommendations workouts={workouts} />
      <EnvironmentActivitySuggestions activities={activities} preferences={preferences} />
    </div>
  );
}
