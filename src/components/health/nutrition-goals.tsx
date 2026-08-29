import { getTranslations } from "next-intl/server";
import { Salad, Droplets, Wheat, Gauge, Candy, Beef, Scale, Heart, Target } from "lucide-react";
import type { NutritionPreferences } from "@/types/health/entities";
import type { NutritionGoal } from "@/lib/health/food-categories";

const GOAL_ICON: Record<NutritionGoal, typeof Salad> = {
  increase_vegetables: Salad,
  improve_hydration: Droplets,
  increase_fiber: Wheat,
  reduce_sodium: Gauge,
  reduce_added_sugar: Candy,
  increase_protein: Beef,
  weight_management: Scale,
  general_healthy_eating: Heart,
};

// Redesign Nutrition spec, Section 14: personalizable, non-prescriptive
// goal chips. Editing happens in the shared Nutrition Preferences form
// (Section 22 — no duplicated preference UI); this section just
// reflects the user's current selection back to them prominently.
export async function NutritionGoals({ preferences }: { preferences: NutritionPreferences | null }) {
  const t = await getTranslations("nutrition.goals");
  const tSection = await getTranslations("nutrition.nutritionGoals");
  const goals = preferences?.goals ?? [];

  return (
    <section className="mb-8 rounded-card border border-surface bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <Target size={18} className="text-muted" />
        <h2 className="text-sm font-semibold text-secondary">{tSection("title")}</h2>
      </div>

      {goals.length === 0 ? (
        <p className="text-sm text-muted">{tSection("empty")}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {goals.map((goal) => {
            const Icon = GOAL_ICON[goal];
            return (
              <span key={goal} className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm text-primary">
                <Icon size={14} />
                {t(goal)}
              </span>
            );
          })}
        </div>
      )}
    </section>
  );
}
