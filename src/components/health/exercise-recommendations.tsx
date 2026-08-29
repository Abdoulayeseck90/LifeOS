import { getTranslations } from "next-intl/server";
import { Lightbulb } from "lucide-react";
import type { Workout } from "@/types/health/entities";
import { getExerciseRecommendations } from "@/lib/health/exercise";

// "Exercise Recommendations" (Spec Section 11 — deliberately not
// "Exercise Suggestions"). Rule-based general wellness guidance only —
// every message is phrased as "Consider..."/"Based on your activity..."
// in the translation strings themselves, never "You need to...". Not
// medical advice, not a diagnosis.
export async function ExerciseRecommendations({ workouts }: { workouts: Workout[] }) {
  const t = await getTranslations("exercise.recommendations");
  const recommendations = getExerciseRecommendations(workouts, new Date());

  if (recommendations.length === 0) return null;

  return (
    <section className="mb-8 rounded-card border border-surface bg-white p-4">
      <div className="mb-3 flex items-center gap-2 text-muted">
        <Lightbulb size={18} />
        <p className="text-xs font-semibold uppercase tracking-wide">{t("title")}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {recommendations.map((rec) => (
          <li key={rec.key} className="text-sm text-secondary">
            {t(rec.key, rec.params)}
          </li>
        ))}
      </ul>
    </section>
  );
}
