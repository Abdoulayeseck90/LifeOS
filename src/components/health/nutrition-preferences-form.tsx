"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { NutritionPreferences } from "@/types/health/entities";
import type { RecordFormRenderProps } from "@/components/core/record-form-modal";
import { CUISINE_OPTIONS, CUISINE_FLAG } from "@/lib/health/cuisines";
import { NUTRITION_GOALS, type NutritionGoal } from "@/lib/health/food-categories";
import { FormField } from "@/components/core/form/form-field";
import { LifeOSInput } from "@/components/core/form/lifeos-input";
import { LifeOSSelect } from "@/components/core/form/lifeos-select";
import { LifeOSCheckbox } from "@/components/core/form/lifeos-checkbox";
import { LifeOSFormActions } from "@/components/core/form/lifeos-form-actions";
import { LifeOSFormSection } from "@/components/core/form/lifeos-form-section";

// Redesign Nutrition spec, Section 16 — every field optional, one row
// per user (upsert), never turned into a medical prescription. Cuisine
// and goals are MULTI-select (Section 16: "A user should be able to
// eat both Senegalese and American food"). Array fields (diet
// preferences/dislikes/allergies/favorite foods) are simple comma-
// separated text rather than a full tag-picker component.
function toArray(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function NutritionPreferencesForm({
  preferences,
  closeAfterSave,
  requestClose,
  registerDirty,
}: { preferences: NutritionPreferences | null } & RecordFormRenderProps) {
  const t = useTranslations("nutrition.preferencesForm");
  const tCommon = useTranslations("common");
  const tCuisines = useTranslations("nutrition.cuisines");
  const tGoals = useTranslations("nutrition.goals");
  const router = useRouter();

  const [cuisinePreferences, setCuisinePreferences] = useState<string[]>(preferences?.cuisine_preferences ?? []);
  const [goals, setGoals] = useState<NutritionGoal[]>(preferences?.goals ?? []);
  const [countryRegion, setCountryRegion] = useState(preferences?.country_region ?? "");
  const [favoriteFoods, setFavoriteFoods] = useState(preferences?.favorite_foods.join(", ") ?? "");
  const [dietPreferences, setDietPreferences] = useState(preferences?.diet_preferences.join(", ") ?? "");
  const [dislikes, setDislikes] = useState(preferences?.dislikes.join(", ") ?? "");
  const [allergies, setAllergies] = useState(preferences?.allergies.join(", ") ?? "");
  const [budget, setBudget] = useState(preferences?.budget ?? "");
  const [cookingTime, setCookingTime] = useState(preferences?.cooking_time ?? "");
  const [hydrationUnit, setHydrationUnit] = useState(preferences?.hydration_unit ?? "L");
  const [hydrationTarget, setHydrationTarget] = useState(
    preferences?.hydration_target_ml != null ? String(preferences.hydration_target_ml / 1000) : ""
  );
  const [calorieTarget, setCalorieTarget] = useState(preferences?.calorie_target?.toString() ?? "");
  const [proteinTarget, setProteinTarget] = useState(preferences?.protein_target_g?.toString() ?? "");
  const [carbsTarget, setCarbsTarget] = useState(preferences?.carbs_target_g?.toString() ?? "");
  const [fatTarget, setFatTarget] = useState(preferences?.fat_target_g?.toString() ?? "");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fieldValues = {
    cuisinePreferences,
    goals,
    countryRegion,
    favoriteFoods,
    dietPreferences,
    dislikes,
    allergies,
    budget,
    cookingTime,
    hydrationUnit,
    hydrationTarget,
    calorieTarget,
    proteinTarget,
    carbsTarget,
    fatTarget,
  };
  const initialSnapshot = useRef(JSON.stringify(fieldValues));
  useEffect(() => {
    registerDirty(JSON.stringify(fieldValues) !== initialSnapshot.current);
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const response = await fetch("/api/health/nutrition/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cuisine_preferences: cuisinePreferences,
        goals,
        country_region: countryRegion || undefined,
        favorite_foods: toArray(favoriteFoods),
        diet_preferences: toArray(dietPreferences),
        dislikes: toArray(dislikes),
        allergies: toArray(allergies),
        budget: budget || undefined,
        cooking_time: cookingTime || undefined,
        hydration_unit: hydrationUnit || undefined,
        hydration_target_ml: hydrationTarget ? Math.round(parseFloat(hydrationTarget) * 1000) : undefined,
        calorie_target: calorieTarget ? parseFloat(calorieTarget) : undefined,
        protein_target_g: proteinTarget ? parseFloat(proteinTarget) : undefined,
        carbs_target_g: carbsTarget ? parseFloat(carbsTarget) : undefined,
        fat_target_g: fatTarget ? parseFloat(fatTarget) : undefined,
      }),
    });

    setSubmitting(false);

    if (!response.ok) {
      setError(t("saveError"));
      return;
    }

    registerDirty(false);
    closeAfterSave();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <p className="text-sm text-status-urgent">{error}</p>}
      <p className="text-xs text-muted">{t("intro")}</p>

      <LifeOSFormSection title={t("dailyTargetsSection")}>
        <p className="-mt-2 text-xs text-muted">{t("dailyTargetsHelper")}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t("calorieTarget")} htmlFor="pref-calorie-target" optional>
            <LifeOSInput id="pref-calorie-target" type="number" min="0" step="any" value={calorieTarget} onChange={(e) => setCalorieTarget(e.target.value)} />
          </FormField>
          <FormField label={t("proteinTarget")} htmlFor="pref-protein-target" optional>
            <LifeOSInput id="pref-protein-target" type="number" min="0" step="any" value={proteinTarget} onChange={(e) => setProteinTarget(e.target.value)} />
          </FormField>
          <FormField label={t("carbsTarget")} htmlFor="pref-carbs-target" optional>
            <LifeOSInput id="pref-carbs-target" type="number" min="0" step="any" value={carbsTarget} onChange={(e) => setCarbsTarget(e.target.value)} />
          </FormField>
          <FormField label={t("fatTarget")} htmlFor="pref-fat-target" optional>
            <LifeOSInput id="pref-fat-target" type="number" min="0" step="any" value={fatTarget} onChange={(e) => setFatTarget(e.target.value)} />
          </FormField>
        </div>
      </LifeOSFormSection>

      <LifeOSFormSection title={t("cuisinePreferences")}>
        <p className="-mt-2 text-xs text-muted">{t("cuisinePreferencesHelper")}</p>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          {CUISINE_OPTIONS.map((c) => (
            <LifeOSCheckbox
              key={c}
              label={`${CUISINE_FLAG[c]} ${tCuisines(c)}`}
              checked={cuisinePreferences.includes(c)}
              onChange={() => setCuisinePreferences((prev) => toggle(prev, c))}
            />
          ))}
        </div>
      </LifeOSFormSection>

      <LifeOSFormSection title={t("goals")}>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
          {NUTRITION_GOALS.map((g) => (
            <LifeOSCheckbox key={g} label={tGoals(g)} checked={goals.includes(g)} onChange={() => setGoals((prev) => toggle(prev, g))} />
          ))}
        </div>
      </LifeOSFormSection>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("countryRegion")} htmlFor="pref-country-region" optional>
          <LifeOSInput id="pref-country-region" type="text" value={countryRegion} onChange={(e) => setCountryRegion(e.target.value)} />
        </FormField>

        <FormField label={t("budget")} htmlFor="pref-budget" optional>
          <LifeOSSelect id="pref-budget" value={budget} onChange={(e) => setBudget(e.target.value)}>
            <option value="">—</option>
            <option value="low">{t("budgetOptions.low")}</option>
            <option value="moderate">{t("budgetOptions.moderate")}</option>
            <option value="flexible">{t("budgetOptions.flexible")}</option>
          </LifeOSSelect>
        </FormField>

        <FormField label={t("cookingTime")} htmlFor="pref-cooking-time" optional>
          <LifeOSSelect id="pref-cooking-time" value={cookingTime} onChange={(e) => setCookingTime(e.target.value)}>
            <option value="">—</option>
            <option value="quick">{t("cookingTimeOptions.quick")}</option>
            <option value="moderate">{t("cookingTimeOptions.moderate")}</option>
            <option value="extended">{t("cookingTimeOptions.extended")}</option>
          </LifeOSSelect>
        </FormField>

        <FormField label={t("hydrationUnit")} htmlFor="pref-hydration-unit" optional>
          <LifeOSSelect id="pref-hydration-unit" value={hydrationUnit} onChange={(e) => setHydrationUnit(e.target.value as typeof hydrationUnit)}>
            <option value="L">{t("hydrationUnitOptions.L")}</option>
            <option value="mL">{t("hydrationUnitOptions.mL")}</option>
            <option value="fl_oz">{t("hydrationUnitOptions.fl_oz")}</option>
          </LifeOSSelect>
        </FormField>

        <FormField label={t("hydrationTarget")} htmlFor="pref-hydration-target" optional helperText={t("hydrationTargetHelper")}>
          <LifeOSInput
            id="pref-hydration-target"
            type="number"
            min="0"
            step="0.1"
            value={hydrationTarget}
            onChange={(e) => setHydrationTarget(e.target.value)}
          />
        </FormField>
      </div>

      <FormField label={t("dietPreferences")} htmlFor="pref-diet" optional helperText={t("commaSeparatedHelper")}>
        <LifeOSInput id="pref-diet" type="text" value={dietPreferences} onChange={(e) => setDietPreferences(e.target.value)} />
      </FormField>

      <FormField label={t("dislikes")} htmlFor="pref-dislikes" optional helperText={t("commaSeparatedHelper")}>
        <LifeOSInput id="pref-dislikes" type="text" value={dislikes} onChange={(e) => setDislikes(e.target.value)} />
      </FormField>

      <FormField label={t("allergies")} htmlFor="pref-allergies" optional helperText={t("commaSeparatedHelper")}>
        <LifeOSInput id="pref-allergies" type="text" value={allergies} onChange={(e) => setAllergies(e.target.value)} />
      </FormField>

      <FormField label={t("favoriteFoods")} htmlFor="pref-favorite-foods" optional helperText={t("commaSeparatedHelper")}>
        <LifeOSInput id="pref-favorite-foods" type="text" value={favoriteFoods} onChange={(e) => setFavoriteFoods(e.target.value)} />
      </FormField>

      <LifeOSFormActions onCancel={requestClose} submitting={submitting} submitLabel={tCommon("save")} />
    </form>
  );
}
