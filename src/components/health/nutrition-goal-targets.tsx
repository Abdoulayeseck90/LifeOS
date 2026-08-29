import { getTranslations } from "next-intl/server";
import { Flame, Beef, Wheat, Droplet, Droplets } from "lucide-react";
import type { NutritionPreferences } from "@/types/health/entities";
import { formatHydrationAmount } from "@/lib/health/hydration";

function TargetRow({ icon: Icon, label, value }: { icon: typeof Flame; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-surface py-2 last:border-b-0">
      <span className="flex items-center gap-1.5 text-sm text-secondary">
        <Icon size={15} className="text-muted" />
        {label}
      </span>
      <span className="text-sm font-medium text-secondary">{value}</span>
    </div>
  );
}

// Redesign Nutrition spec, Goals tab — read-only display of the
// user's own numeric targets (Section 4: "Users should enter their
// own targets," never an auto-prescribed number). A target left unset
// shows "Not set," never a default value passed off as the user's own.
export async function NutritionGoalTargets({ preferences }: { preferences: NutritionPreferences | null }) {
  const t = await getTranslations("nutrition.goalsTab");
  const notSet = t("notSet");

  const hydrationUnit = preferences?.hydration_unit ?? "L";

  return (
    <section className="mb-8 rounded-card border border-surface bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold text-secondary">{t("targetsTitle")}</h2>
      <div className="flex flex-col">
        <TargetRow icon={Flame} label={t("calorieTarget")} value={preferences?.calorie_target != null ? `${preferences.calorie_target} kcal` : notSet} />
        <TargetRow icon={Beef} label={t("proteinTarget")} value={preferences?.protein_target_g != null ? `${preferences.protein_target_g} g` : notSet} />
        <TargetRow icon={Wheat} label={t("carbsTarget")} value={preferences?.carbs_target_g != null ? `${preferences.carbs_target_g} g` : notSet} />
        <TargetRow icon={Droplet} label={t("fatTarget")} value={preferences?.fat_target_g != null ? `${preferences.fat_target_g} g` : notSet} />
        <TargetRow
          icon={Droplets}
          label={t("waterTarget")}
          value={preferences?.hydration_target_ml != null ? formatHydrationAmount(preferences.hydration_target_ml, hydrationUnit) : notSet}
        />
      </div>
    </section>
  );
}
