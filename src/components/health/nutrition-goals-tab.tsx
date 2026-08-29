import { getTranslations } from "next-intl/server";
import type { Condition, NutritionPreferences, NutritionRestriction } from "@/types/health/entities";
import { NutritionGoals } from "@/components/health/nutrition-goals";
import { NutritionGoalTargets } from "@/components/health/nutrition-goal-targets";
import { NutritionPreferencesButton } from "@/components/health/nutrition-preferences-button";
import { NutritionRestrictionCard } from "@/components/health/nutrition-restriction-card";
import { NutritionRestrictionAddButton } from "@/components/health/nutrition-restriction-add-button";
import { NutritionSources } from "@/components/health/nutrition-sources";

// Redesign Nutrition spec, Goals tab — the user's own category goals
// and numeric targets, with a single "Edit Goals" entry point (the
// same nutrition preferences form used everywhere, Section 22: no
// duplicated preference UI). Restrictions and target sources are
// relocated here (closest matching tab) rather than dropped.
export async function NutritionGoalsTab({
  preferences,
  restrictions,
  conditions,
}: {
  preferences: NutritionPreferences | null;
  restrictions: NutritionRestriction[];
  conditions: Condition[];
}) {
  const t = await getTranslations("nutrition");

  return (
    <div>
      <NutritionGoals preferences={preferences} />
      <NutritionGoalTargets preferences={preferences} />

      <div className="mb-8">
        <NutritionPreferencesButton preferences={preferences} />
      </div>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("restrictions")}</h2>
          <NutritionRestrictionAddButton conditions={conditions} />
        </div>
        {restrictions.length === 0 ? (
          <div className="rounded-card border border-dashed border-surface p-8 text-center">
            <p className="text-sm text-muted">{t("emptyRestrictions")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {restrictions.map((restriction) => (
              <NutritionRestrictionCard key={restriction.id} restriction={restriction} conditions={conditions} />
            ))}
          </div>
        )}
      </section>

      <NutritionSources />
    </div>
  );
}
