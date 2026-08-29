import type { Activity, ActivityCategory, EquipmentOption, ActivityPreference, ExerciseEnvironment } from "@/types/health/entities";

// Universal Exercise & Activity Library spec, Section 8/10 — display
// order for the 5 category sections. Deliberately generic/global, not
// tied to any one country's activities.
export const ACTIVITY_CATEGORIES: ActivityCategory[] = ["cardio", "sports", "strength", "mobility_flexibility", "daily_activity"];

export const EQUIPMENT_OPTIONS: EquipmentOption[] = ["none", "home_equipment", "resistance_bands", "dumbbells", "kettlebells", "full_gym", "other"];

export const ACTIVITY_PREFERENCE_OPTIONS: ActivityPreference[] = [
  "walking",
  "running",
  "cycling",
  "swimming",
  "gym",
  "home_workout",
  "sports",
  "yoga_pilates",
  "mobility",
  "other",
];

export const EXERCISE_ENVIRONMENT_OPTIONS: ExerciseEnvironment[] = ["home_no_equipment", "outdoor", "gym", "limited_mobility", "small_space", "flexible"];

export function groupActivitiesByCategory(activities: Activity[]): { category: ActivityCategory; activities: Activity[] }[] {
  return ACTIVITY_CATEGORIES.map((category) => ({
    category,
    activities: activities.filter((a) => a.categories.includes(category)),
  }));
}

// Section 8: "Do not assume that the user has access to a gym or
// specialized equipment." An empty/unset equipment list means we
// don't know the user's setup yet, so nothing is filtered out —
// filtering is an opt-in "show only what I can do" view, not a
// default restriction.
export function filterActivitiesByEquipment(activities: Activity[], equipment: EquipmentOption[]): Activity[] {
  if (equipment.length === 0) return activities;
  const owned = new Set(equipment);
  return activities.filter((a) => a.equipment_needed.includes("none") || a.equipment_needed.some((e) => owned.has(e)));
}

// Section 9: Accessibility & Environment — deterministic mapping from
// the user's stated context to a practical activity subset. Never
// assumes every user can perform every exercise.
export function suggestActivitiesForEnvironment(activities: Activity[], environment: ExerciseEnvironment): Activity[] {
  switch (environment) {
    case "home_no_equipment":
      return activities.filter((a) => a.equipment_needed.includes("none") && (a.environments.includes("home") || a.environments.includes("anywhere")));
    case "outdoor":
      return activities.filter((a) => a.environments.includes("outdoor"));
    case "gym":
      return activities.filter((a) => a.environments.includes("gym"));
    case "limited_mobility":
      return activities.filter((a) => a.tags.includes("limited_mobility_friendly"));
    case "small_space":
      return activities.filter((a) => a.tags.includes("small_space_friendly"));
    case "flexible":
    default:
      return activities;
  }
}
