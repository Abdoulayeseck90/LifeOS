"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ActivityPreference, EquipmentOption, ExercisePreferences } from "@/types/health/entities";
import type { RecordFormRenderProps } from "@/components/core/record-form-modal";
import { EQUIPMENT_OPTIONS, ACTIVITY_PREFERENCE_OPTIONS } from "@/lib/health/activity-library";
import { FormField } from "@/components/core/form/form-field";
import { LifeOSInput } from "@/components/core/form/lifeos-input";
import { LifeOSSelect } from "@/components/core/form/lifeos-select";
import { LifeOSCheckbox } from "@/components/core/form/lifeos-checkbox";
import { LifeOSFormActions } from "@/components/core/form/lifeos-form-actions";
import { LifeOSFormSection } from "@/components/core/form/lifeos-form-section";

// Universal Exercise & Activity Library spec, Section 8: equipment and
// activity preference are multi-select (a user may have more than one
// piece of equipment, or like more than one activity type) — every
// field optional, never a medical prescription. custom_activities
// (Section 11) is explicitly optional cultural/regional personalization
// layered on top of the universal library, not a replacement for it.
function toArray(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function ExercisePreferencesForm({
  preferences,
  closeAfterSave,
  requestClose,
  registerDirty,
}: { preferences: ExercisePreferences | null } & RecordFormRenderProps) {
  const t = useTranslations("exercise.preferencesForm");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [equipment, setEquipment] = useState<EquipmentOption[]>(preferences?.equipment ?? []);
  const [activityPreferences, setActivityPreferences] = useState<ActivityPreference[]>(preferences?.activity_preferences ?? []);
  const [fitnessLevel, setFitnessLevel] = useState(preferences?.fitness_level ?? "");
  const [availableTime, setAvailableTime] = useState(preferences?.available_time ?? "");
  const [environment, setEnvironment] = useState(preferences?.environment ?? "");
  const [customActivities, setCustomActivities] = useState(preferences?.custom_activities.join(", ") ?? "");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fieldValues = { equipment, activityPreferences, fitnessLevel, availableTime, environment, customActivities };
  const initialSnapshot = useRef(JSON.stringify(fieldValues));
  useEffect(() => {
    registerDirty(JSON.stringify(fieldValues) !== initialSnapshot.current);
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const response = await fetch("/api/health/exercise/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        equipment,
        activity_preferences: activityPreferences,
        fitness_level: fitnessLevel || undefined,
        available_time: availableTime || undefined,
        environment: environment || undefined,
        custom_activities: toArray(customActivities),
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

      <LifeOSFormSection title={t("equipment")}>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
          {EQUIPMENT_OPTIONS.map((option) => (
            <LifeOSCheckbox
              key={option}
              label={t(`equipmentOptions.${option}`)}
              checked={equipment.includes(option)}
              onChange={() => setEquipment((prev) => toggle(prev, option))}
            />
          ))}
        </div>
      </LifeOSFormSection>

      <LifeOSFormSection title={t("activityPreferences")}>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
          {ACTIVITY_PREFERENCE_OPTIONS.map((option) => (
            <LifeOSCheckbox
              key={option}
              label={t(`activityPreferenceOptions.${option}`)}
              checked={activityPreferences.includes(option)}
              onChange={() => setActivityPreferences((prev) => toggle(prev, option))}
            />
          ))}
        </div>
      </LifeOSFormSection>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label={t("fitnessLevel")} htmlFor="pref-fitness-level" optional>
          <LifeOSSelect id="pref-fitness-level" value={fitnessLevel} onChange={(e) => setFitnessLevel(e.target.value as typeof fitnessLevel)}>
            <option value="">—</option>
            <option value="beginner">{t("fitnessLevelOptions.beginner")}</option>
            <option value="intermediate">{t("fitnessLevelOptions.intermediate")}</option>
            <option value="advanced">{t("fitnessLevelOptions.advanced")}</option>
          </LifeOSSelect>
        </FormField>

        <FormField label={t("availableTime")} htmlFor="pref-available-time" optional>
          <LifeOSSelect id="pref-available-time" value={availableTime} onChange={(e) => setAvailableTime(e.target.value as typeof availableTime)}>
            <option value="">—</option>
            <option value="quick">{t("availableTimeOptions.quick")}</option>
            <option value="moderate">{t("availableTimeOptions.moderate")}</option>
            <option value="extended">{t("availableTimeOptions.extended")}</option>
          </LifeOSSelect>
        </FormField>

        <FormField label={t("environment")} htmlFor="pref-environment" optional>
          <LifeOSSelect id="pref-environment" value={environment} onChange={(e) => setEnvironment(e.target.value as typeof environment)}>
            <option value="">—</option>
            <option value="home_no_equipment">{t("environmentOptions.home_no_equipment")}</option>
            <option value="outdoor">{t("environmentOptions.outdoor")}</option>
            <option value="gym">{t("environmentOptions.gym")}</option>
            <option value="limited_mobility">{t("environmentOptions.limited_mobility")}</option>
            <option value="small_space">{t("environmentOptions.small_space")}</option>
            <option value="flexible">{t("environmentOptions.flexible")}</option>
          </LifeOSSelect>
        </FormField>
      </div>

      <FormField label={t("customActivities")} htmlFor="pref-custom-activities" optional helperText={t("customActivitiesHelper")}>
        <LifeOSInput id="pref-custom-activities" type="text" value={customActivities} onChange={(e) => setCustomActivities(e.target.value)} />
      </FormField>

      <LifeOSFormActions onCancel={requestClose} submitting={submitting} submitLabel={tCommon("save")} />
    </form>
  );
}
