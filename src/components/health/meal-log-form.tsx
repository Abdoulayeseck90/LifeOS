"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { MealLogEntry } from "@/types/health/entities";
import type { RecordFormRenderProps } from "@/components/core/record-form-modal";
import { FormField } from "@/components/core/form/form-field";
import { LifeOSInput } from "@/components/core/form/lifeos-input";
import { LifeOSSelect } from "@/components/core/form/lifeos-select";
import { LifeOSTextarea } from "@/components/core/form/lifeos-textarea";
import { LifeOSFormSection } from "@/components/core/form/lifeos-form-section";
import { LifeOSFormActions } from "@/components/core/form/lifeos-form-actions";

// Hosted inside RecordFormModal — see appointment-form.tsx for the
// pattern. Passing `mealLogEntry` switches to edit mode.
//
// Expand Nutrition spec, Section 15: logging a simple meal (date, meal
// type, description) stays the fast path — every nutrient field is
// optional and tucked behind "More details" (Section 15: "the user
// should be able to quickly log a simple meal").
export function MealLogForm({
  mealLogEntry,
  closeAfterSave,
  requestClose,
  registerDirty,
}: Partial<{ mealLogEntry: MealLogEntry }> & RecordFormRenderProps) {
  const t = useTranslations("nutrition.mealForm");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [date, setDate] = useState(mealLogEntry?.date ?? new Date().toISOString().slice(0, 10));
  const [mealType, setMealType] = useState<MealLogEntry["meal_type"]>(mealLogEntry?.meal_type ?? "breakfast");
  const [description, setDescription] = useState(mealLogEntry?.description ?? "");
  const [notes, setNotes] = useState(mealLogEntry?.notes ?? "");
  const [calories, setCalories] = useState(mealLogEntry?.calories?.toString() ?? "");
  const [proteinG, setProteinG] = useState(mealLogEntry?.protein_g?.toString() ?? "");
  const [carbsG, setCarbsG] = useState(mealLogEntry?.carbs_g?.toString() ?? "");
  const [fatG, setFatG] = useState(mealLogEntry?.fat_g?.toString() ?? "");
  const [fiberG, setFiberG] = useState(mealLogEntry?.fiber_g?.toString() ?? "");
  const [sugarG, setSugarG] = useState(mealLogEntry?.sugar_g?.toString() ?? "");
  const [sodiumMg, setSodiumMg] = useState(mealLogEntry?.sodium_mg?.toString() ?? "");
  const [fruitVegG, setFruitVegG] = useState(mealLogEntry?.fruit_veg_g?.toString() ?? "");
  const [fruitVegPortions, setFruitVegPortions] = useState(mealLogEntry?.fruit_veg_portions?.toString() ?? "");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fieldValues = {
    date,
    mealType,
    description,
    notes,
    calories,
    proteinG,
    carbsG,
    fatG,
    fiberG,
    sugarG,
    sodiumMg,
    fruitVegG,
    fruitVegPortions,
  };
  const initialSnapshot = useRef(JSON.stringify(fieldValues));
  useEffect(() => {
    registerDirty(JSON.stringify(fieldValues) !== initialSnapshot.current);
  });

  function toNumberOrUndefined(value: string): number | undefined {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError(t("descriptionRequired"));
      return;
    }

    setSubmitting(true);

    const body = JSON.stringify({
      date,
      meal_type: mealType,
      description: description.trim(),
      notes: notes.trim() || undefined,
      calories: toNumberOrUndefined(calories),
      protein_g: toNumberOrUndefined(proteinG),
      carbs_g: toNumberOrUndefined(carbsG),
      fat_g: toNumberOrUndefined(fatG),
      fiber_g: toNumberOrUndefined(fiberG),
      sugar_g: toNumberOrUndefined(sugarG),
      sodium_mg: toNumberOrUndefined(sodiumMg),
      fruit_veg_g: toNumberOrUndefined(fruitVegG),
      fruit_veg_portions: toNumberOrUndefined(fruitVegPortions),
    });

    const response = mealLogEntry
      ? await fetch(`/api/health/nutrition/meals/${mealLogEntry.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body,
        })
      : await fetch("/api/health/nutrition/meals", {
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
    closeAfterSave();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && <p className="text-sm text-status-urgent">{error}</p>}

      <LifeOSFormSection title={t("mealInformationSection")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t("date")} htmlFor="meal-date" required>
            <LifeOSInput id="meal-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </FormField>
          <FormField label={t("mealType")} htmlFor="meal-type">
            <LifeOSSelect id="meal-type" value={mealType} onChange={(e) => setMealType(e.target.value as MealLogEntry["meal_type"])}>
              <option value="breakfast">{t("mealTypeOptions.breakfast")}</option>
              <option value="lunch">{t("mealTypeOptions.lunch")}</option>
              <option value="dinner">{t("mealTypeOptions.dinner")}</option>
              <option value="snack">{t("mealTypeOptions.snack")}</option>
            </LifeOSSelect>
          </FormField>
        </div>

        <FormField label={t("description")} htmlFor="meal-description" required>
          <LifeOSInput
            id="meal-description"
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("descriptionPlaceholder")}
          />
        </FormField>
      </LifeOSFormSection>

      <button type="button" onClick={() => setExpanded((v) => !v)} className="w-fit text-sm font-medium text-primary hover:underline">
        {expanded ? t("fewerDetails") : t("moreDetails")}
      </button>

      {expanded && (
        <LifeOSFormSection title={t("nutritionDetailsSection")}>
          <p className="-mt-1 text-xs text-muted">{t("nutritionDetailsHelper")}</p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t("calories")} htmlFor="meal-calories" optional>
              <LifeOSInput id="meal-calories" type="number" min={0} step="any" value={calories} onChange={(e) => setCalories(e.target.value)} />
            </FormField>
            <FormField label={t("protein")} htmlFor="meal-protein" optional>
              <LifeOSInput id="meal-protein" type="number" min={0} step="any" value={proteinG} onChange={(e) => setProteinG(e.target.value)} />
            </FormField>
            <FormField label={t("carbs")} htmlFor="meal-carbs" optional>
              <LifeOSInput id="meal-carbs" type="number" min={0} step="any" value={carbsG} onChange={(e) => setCarbsG(e.target.value)} />
            </FormField>
            <FormField label={t("fat")} htmlFor="meal-fat" optional>
              <LifeOSInput id="meal-fat" type="number" min={0} step="any" value={fatG} onChange={(e) => setFatG(e.target.value)} />
            </FormField>
            <FormField label={t("fiber")} htmlFor="meal-fiber" optional>
              <LifeOSInput id="meal-fiber" type="number" min={0} step="any" value={fiberG} onChange={(e) => setFiberG(e.target.value)} />
            </FormField>
            <FormField label={t("sugar")} htmlFor="meal-sugar" optional helperText={t("sugarHelper")}>
              <LifeOSInput id="meal-sugar" type="number" min={0} step="any" value={sugarG} onChange={(e) => setSugarG(e.target.value)} />
            </FormField>
            <FormField label={t("sodium")} htmlFor="meal-sodium" optional>
              <LifeOSInput id="meal-sodium" type="number" min={0} step="any" value={sodiumMg} onChange={(e) => setSodiumMg(e.target.value)} />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t("fruitVegG")} htmlFor="meal-fruit-veg-g" optional>
              <LifeOSInput id="meal-fruit-veg-g" type="number" min={0} step="any" value={fruitVegG} onChange={(e) => setFruitVegG(e.target.value)} />
            </FormField>
            <FormField label={t("fruitVegPortions")} htmlFor="meal-fruit-veg-portions" optional>
              <LifeOSInput
                id="meal-fruit-veg-portions"
                type="number"
                min={0}
                step="any"
                value={fruitVegPortions}
                onChange={(e) => setFruitVegPortions(e.target.value)}
              />
            </FormField>
          </div>

          <FormField label={t("notes")} htmlFor="meal-notes" optional>
            <LifeOSTextarea id="meal-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
        </LifeOSFormSection>
      )}

      <LifeOSFormActions onCancel={requestClose} submitting={submitting} submitLabel={tCommon("save")} />
    </form>
  );
}
