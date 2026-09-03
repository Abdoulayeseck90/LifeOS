// Health domain entity types — Spec Sections 9–20.
// Generic and condition-agnostic by design (Spec Section 43: "Do not
// hard-code the application around Hepatitis B"). Hepatitis B is the
// first Condition row, not a special-cased table.

import type { Cuisine } from "@/lib/health/cuisines";
import type { FoodCategory, NutritionGoal } from "@/lib/health/food-categories";
import type { FoodClassification } from "@/lib/health/classification";

export interface Condition {
  id: string;
  user_id: string;
  name: string;
  diagnosis_date: string | null;
  status: "active" | "monitoring" | "resolved";
  description: string | null;
  provider_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// The 5 top-level categories (0018_diagnostic_test_categories.sql) are a
// fixed, spec-defined taxonomy — unlike test_type below, which stays
// free text on purpose.
export type DiagnosticTestCategory = "imaging" | "cardiology" | "pathology" | "microbiology" | "other";

// test_type is deliberately not a table-per-type or a closed union —
// Spec Addendum Section 2 requires new diagnostic test types without a
// DB redesign, so it's a plain string and type-specific structured
// fields live in `measurements`, not new columns.
export interface DiagnosticTest {
  id: string;
  user_id: string;
  test_type: string;
  category: DiagnosticTestCategory | null;
  body_part: string | null;
  study_date: string;
  facility: string | null;
  provider: string | null;
  indication: string | null;
  findings: string | null;
  impression: string | null;
  measurements: Record<string, string | number | boolean | null>;
  abnormalities: string | null;
  follow_up: string | null;
  notes: string | null;
  related_condition_id: string | null;
  source_document_id: string | null;
  created_at: string;
  updated_at: string;
}

// Shared reference data, not user-owned — see TestDefinition above and
// the comment in 0008_guidelines.sql. Maintained by migration/seed, not
// created through the app.
export interface Guideline {
  id: string;
  organization: string;
  title: string;
  publication_year: number | null;
  version: string | null;
  source: string | null;
  applicable_conditions: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonitoringPlan {
  id: string;
  user_id: string;
  condition_id: string | null;
  name: string;
  description: string | null;
  status: "active" | "paused" | "completed" | "archived";
  clinician_notes: string | null;
  created_at: string;
  updated_at: string;
}

export type MonitoringIntervalUnit = "days" | "weeks" | "months" | "years";

// upcoming/due_soon/due/overdue are deliberately not part of this
// union — they're computed from next_due_at at read time
// (services/health/monitoring.ts, getMonitoringItemDisplayStatus), not
// stored, since nothing re-scans rows as time passes to keep a stored
// version from going stale.
export type MonitoringItemStatus = "active" | "completed" | "cancelled" | "deferred";
export type MonitoringItemDisplayStatus = "due_soon" | "due" | "overdue" | "upcoming" | MonitoringItemStatus;
export type MonitoringSource = "guideline" | "clinician" | "user";

export interface MonitoringItem {
  id: string;
  monitoring_plan_id: string;
  user_id: string;
  name: string;
  category: string | null;
  test_type: string | null;
  interval_value: number | null;
  interval_unit: MonitoringIntervalUnit | null;
  frequency_note: string | null;
  last_completed_at: string | null;
  next_due_at: string | null;
  status: MonitoringItemStatus;
  source: MonitoringSource;
  guideline_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type LabCategory =
  | "hepatitis_b"
  | "liver"
  | "kidney_renal"
  | "blood_cbc"
  | "metabolic"
  | "thyroid"
  | "iron_nutrition"
  | "inflammation_immune"
  | "pancreas"
  | "cardiovascular"
  | "other";

// Universal Reference System spec, Section 21 — the 4 approved-source
// categories plus a residual bucket. Google/search engines are never a
// source themselves (Section 1) — every row here traces to one named,
// fetchable, trusted page.
export type ReferenceSourceType =
  | "laboratory_report"
  | "government_agency"
  | "academic_institution"
  | "clinical_guideline"
  | "other_reputable_source";

// Universal Reference System spec, Section 1 — must NOT blindly call
// everything a "normal range." reference_range/reference_value are
// plain numeric bands/thresholds (labs, heart rate); expected_range is
// the same shape but framed for a naturally variable measurement
// (temperature); clinical_target is a treatment goal; guideline_threshold
// is a named category bracket (BP stages, BMI categories); not_available
// means exactly that — never invented.
export type ReferenceKind =
  | "reference_range"
  | "reference_value"
  | "expected_range"
  | "clinical_target"
  | "guideline_threshold"
  | "not_available";

// One shared, reusable reference-standard catalog (Section 12: "do not
// build separate reference-range logic for every page") — Labs, Vitals,
// and future modules all read from this same table. A lab-provided
// range on the individual LabResult itself always wins; this catalog is
// only ever a fallback, consulted when the specific measurement/result
// didn't come with its own range. Shared/curated reference data, not
// user-owned (same shape as TestDefinition below).
export interface ReferenceStandard {
  id: string;
  // Present for lab rows (FK to test_definitions, unchanged from the
  // original Lab Results-only version of this table); null for
  // everything else, which is looked up by metric_key instead.
  test_definition_id: string | null;
  // Generic lookup key every module uses: 'lab:<test code>',
  // 'vital:<type>', 'body_metric:<type>'.
  metric_key: string;
  reference_kind: ReferenceKind;
  reference_low: number | null;
  reference_high: number | null;
  // Only set on guideline_threshold rows — the category label itself
  // (e.g. "Elevated", "Normal weight").
  reference_category: string | null;
  // Only set for two-part measurements (blood pressure) — which half
  // of the reading this row's low/high describes.
  component: "systolic" | "diastolic" | null;
  unit: string | null;
  applicable_population: string | null;
  source_name: string;
  source_url: string;
  source_type: ReferenceSourceType;
  source_version: string | null;
  guideline_version: string | null;
  retrieved_at: string;
  created_at: string;
  updated_at: string;
}

export interface TestDefinition {
  id: string;
  name_en: string;
  name_fr: string;
  code: string | null;
  category: LabCategory;
  default_unit: string | null;
  description: string | null;
  active: boolean;
  // Expand Lab Test Selection spec, Section 13/14 — global/curated
  // tests have is_custom=false, user_id=null; a test a user typed into
  // "+ Add other test" has is_custom=true and their own user_id. Never
  // promoted from one to the other automatically.
  is_custom: boolean;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export type LabResultStatusKey = "normal" | "low" | "high" | "critical" | "abnormal";

export interface LabResult {
  id: string;
  user_id: string;
  test_definition_id: string;
  category: LabCategory;
  value_numeric: number | null;
  value_text: string | null;
  unit: string | null;
  reference_low: number | null;
  reference_high: number | null;
  reference_text: string | null;
  abnormal_flag: boolean;
  // Preserves a status the source lab already stated verbatim (Spec
  // "Redesign Lab Results" Section 6) — null means not specified, and
  // the UI falls back to computing normal/low/high from the reference
  // range instead. LifeOS itself never computes "critical".
  result_status: LabResultStatusKey | null;
  collection_date: string;
  result_date: string | null;
  ordering_provider: string | null;
  facility: string | null;
  source_document_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Medication {
  id: string;
  user_id: string;
  name: string;
  dose: string | null;
  unit: string | null;
  frequency: string | null;
  route: string | null;
  start_date: string | null;
  end_date: string | null;
  status: "active" | "discontinued" | "planned";
  prescriber: string | null;
  reason: string | null;
  instructions: string | null;
  side_effect_notes: string | null;
  related_condition_id: string | null;
  source_document_id: string | null;
  created_at: string;
  updated_at: string;
}

export type AppointmentCategory = "medical" | "work" | "personal" | "financial" | "travel" | "other";
export type RecurrenceEditScope = "series" | "this" | "following";

// This appointment record now belongs to the global Calendar feature,
// not Health specifically — category/title/description/end_time/
// recurrence_* are generic to any kind of appointment. provider_name
// stays as the medical-specific label every pre-existing (and any new
// medical) appointment uses; related_condition_id is the optional
// Health-relationship facet, independent of category. Kept here rather
// than moved to types/core to avoid rewriting ~10 unrelated Health
// files' import paths for a purely organizational change.
export interface Appointment {
  id: string;
  user_id: string;
  title: string | null;
  description: string | null;
  provider_name: string | null;
  specialty: string | null;
  appointment_type: string | null;
  date_time: string;
  end_time: string | null;
  location: string | null;
  category: AppointmentCategory;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  preparation_notes: string | null;
  clinician_instructions: string | null;
  follow_up_date: string | null;
  related_condition_id: string | null;
  notes: string | null;
  reminder_lead_minutes: number | null;
  recurrence_rule: string | null;
  recurrence_excluded_occurrences: string[];
  recurrence_parent_id: string | null;
  recurrence_original_start: string | null;
  created_at: string;
  updated_at: string;
}

export interface DoctorQuestion {
  id: string;
  user_id: string;
  question: string;
  answer: string | null;
  answered: boolean;
  needs_follow_up: boolean;
  related_condition_id: string | null;
  related_appointment_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SymptomEntry {
  id: string;
  user_id: string;
  symptom: string;
  severity: number | null; // 1-10, nullable — not every entry needs a score
  onset: string | null;
  duration: string | null;
  frequency: string | null;
  context: string | null;
  notes: string | null;
  related_condition_id: string | null;
  appointment_reference_id: string | null;
  created_at: string;
}

export type BodyMetricType = "weight" | "height" | "bmi" | "waist_circumference" | "body_fat_percentage";

// entry_source/source_document_id/related_appointment_id/related_condition_id/
// source_interpretation/source_reference_range/is_calculated/updated_at were
// added in 0019_vitals_extended.sql. `source` (free text, e.g. "Apple
// Watch") predates that migration and means something different from the
// new structured `entry_source` — see that migration's comment.
export type VitalEntrySource = "manual" | "medical_visit" | "imported" | "other";

export interface BodyMetric {
  id: string;
  user_id: string;
  metric_type: BodyMetricType;
  value: number;
  unit: string;
  measured_at: string;
  source: string | null;
  notes: string | null;
  entry_source: VitalEntrySource;
  source_document_id: string | null;
  related_appointment_id: string | null;
  related_condition_id: string | null;
  // Preserved verbatim from a source medical record only — never
  // computed/inferred by LifeOS (Spec Section 10).
  source_interpretation: string | null;
  source_reference_range: string | null;
  // true only when this row (a BMI entry) was auto-computed by LifeOS
  // from a paired height+weight entry, never for a directly-entered/
  // imported BMI value (Spec Section 6).
  is_calculated: boolean;
  created_at: string;
  updated_at: string;
}

// Vitals — the central home for measurable body readings. One generic
// table (see 0014_vitals.sql) rather than table-per-vital-type: only
// blood_pressure has a working form today, but heart_rate/temperature/
// spo2/respiratory_rate are already structured in so they can be added
// later without a schema redesign. Weight stays in BodyMetric above —
// it already had a working generic home, so it isn't duplicated here,
// only relocated in the nav/UI (see health/vitals/page.tsx).
export type VitalType = "blood_pressure" | "heart_rate" | "temperature" | "spo2" | "respiratory_rate";
export type BloodPressurePosition = "sitting" | "standing" | "lying";
export type BloodPressureArm = "left" | "right";

export interface Vital {
  id: string;
  user_id: string;
  vital_type: VitalType;
  recorded_at: string;
  // blood_pressure fields
  systolic: number | null;
  diastolic: number | null;
  pulse: number | null; // also used standalone for vital_type "heart_rate"
  position: BloodPressurePosition | null;
  arm: BloodPressureArm | null;
  // generic single-value fields (temperature, spo2, respiratory_rate)
  value: number | null;
  unit: string | null;
  notes: string | null;
  // Added in 0019_vitals_extended.sql.
  source: VitalEntrySource;
  source_document_id: string | null;
  related_appointment_id: string | null;
  related_condition_id: string | null;
  // Preserved verbatim from a source medical record only — never
  // computed/inferred by LifeOS (Spec Section 10).
  source_interpretation: string | null;
  source_reference_range: string | null;
  created_at: string;
  updated_at: string;
}

// Exercise & Fitness — deliberately separate from Vitals ("what did I
// do" vs "how is my body measuring", see 0016_workouts.sql). One row per
// logged session, not a per-set/per-exercise relational model — an MVP
// scope call, not an oversight.
export type WorkoutType = "walking" | "running" | "cycling" | "strength" | "other";
export type WorkoutStatus = "completed" | "scheduled" | "cancelled";

export interface Workout {
  id: string;
  user_id: string;
  workout_type: WorkoutType;
  status: WorkoutStatus;
  started_at: string;
  duration_minutes: number | null;
  distance_value: number | null;
  distance_unit: string | null;
  calories: number | null;
  steps: number | null;
  sets: number | null;
  reps: number | null;
  weight_resistance: number | null;
  weight_unit: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Universal Exercise & Activity Library spec, Section 8/10 — global,
// curated reference content, never country-specific by default.
export type ActivityCategory = "cardio" | "sports" | "strength" | "mobility_flexibility" | "daily_activity";
export type EquipmentOption = "none" | "home_equipment" | "resistance_bands" | "dumbbells" | "kettlebells" | "full_gym" | "other";
export type ActivityEnvironment = "home" | "outdoor" | "gym" | "anywhere";
export type ActivityTag = "low_impact" | "small_space_friendly" | "limited_mobility_friendly";

export interface Activity {
  id: string;
  name_en: string;
  name_fr: string;
  categories: ActivityCategory[];
  equipment_needed: EquipmentOption[];
  environments: ActivityEnvironment[];
  tags: string[];
  created_at: string;
}

export type ActivityPreference = "walking" | "running" | "cycling" | "swimming" | "gym" | "home_workout" | "sports" | "yoga_pilates" | "mobility" | "other";
export type FitnessLevel = "beginner" | "intermediate" | "advanced";
export type AvailableTime = "quick" | "moderate" | "extended";
// The user's own typical context — feeds Section 9's environment-aware
// suggestions. Distinct from Activity.environments (per-activity).
export type ExerciseEnvironment = "home_no_equipment" | "outdoor" | "gym" | "limited_mobility" | "small_space" | "flexible";

export interface ExercisePreferences {
  id: string;
  user_id: string;
  equipment: EquipmentOption[];
  activity_preferences: ActivityPreference[];
  fitness_level: FitnessLevel | null;
  available_time: AvailableTime | null;
  environment: ExerciseEnvironment | null;
  // Section 11: optional cultural/regional personalization, layered on
  // top of the universal library — never required.
  custom_activities: string[];
  created_at: string;
  updated_at: string;
}

// V1 scope trimmed per Spec Section 51.1 — meal logging + clinician
// restrictions only. Full food database / macro tracking / grocery
// lists are Phase 6.
export interface MealLogEntry {
  id: string;
  user_id: string;
  date: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  description: string;
  notes: string | null;
  // Expand Nutrition spec — all optional (Section 15: never require
  // every field just to log a simple meal). sugar_g is whatever the
  // user reads off a label/estimates, not an algorithmically-derived
  // "free sugar" value (no food-composition database backs this app).
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
  fruit_veg_g: number | null;
  fruit_veg_portions: number | null;
  created_at: string;
}

export interface NutritionRestriction {
  id: string;
  user_id: string;
  restriction: string;
  source: "clinician" | "self_reported";
  related_condition_id: string | null;
  created_at: string;
}

// Redesign Nutrition spec, Section 17: cuisine is an extensible, plain
// string — the canonical known list (used for filters/labels) lives in
// src/lib/health/cuisines.ts, not here, so new cuisines never require
// a type change. Aliased under the old name since it's still imported
// as `MealCuisine` in a couple of places.
export type MealCuisine = Cuisine;
export type MealRating = "best_choice" | "good_choice" | "moderation" | "consider_modifying";

export interface BilingualText {
  en: string;
  fr: string;
}

// Global/curated content, not user-owned (same shape as
// TestDefinition) — every macro figure is an estimate, never claimed
// as lab-measured (Spec Section 24).
export interface Meal {
  id: string;
  name_en: string;
  name_fr: string;
  description_en: string | null;
  description_fr: string | null;
  cuisine: MealCuisine;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  serving_size_en: string | null;
  serving_size_fr: string | null;
  ingredients: BilingualText[];
  preparation_en: string | null;
  preparation_fr: string | null;
  liver_conscious_preparation: BilingualText[];
  foods_to_reduce: BilingualText[];
  substitutions: BilingualText[];
  calories_kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
  rating: MealRating;
  rating_reason_en: string | null;
  rating_reason_fr: string | null;
  tags: string[];
  suggested_swap_meal_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface NutritionPreferences {
  id: string;
  user_id: string;
  // Superseded by cuisine_preferences (multi-select, Redesign
  // Nutrition spec Section 16) — left in place, unused by new UI, so
  // no existing row's data is lost (backfilled into cuisine_preferences
  // by migration 0030). Plain string (not Cuisine) since it's no longer
  // validated against the known cuisine list.
  cuisine: string | null;
  goal:
    | "balanced_eating"
    | "increase_fiber"
    | "reduce_sodium"
    | "reduce_free_sugar"
    | "increase_vegetables"
    | "maintain_weight"
    | "gain_weight"
    | "lose_weight"
    | null;
  diet_preferences: string[];
  dislikes: string[];
  allergies: string[];
  budget: "low" | "moderate" | "flexible" | null;
  cooking_time: "quick" | "moderate" | "extended" | null;
  hydration_unit: HydrationUnit | null;
  // User override only — null means "use the general estimate,"
  // never an auto-computed medical prescription (Section 27).
  hydration_target_ml: number | null;
  // Redesign Nutrition spec, Section 16 — multi-select cuisine, used by
  // Food & Meals default filtering and the Meal Planner generator.
  // Open string array, not Cuisine[] — validated loosely (any string
  // up to 50 chars) so a future cuisine never needs a type change
  // either; the UI itself only ever offers the known CUISINE_OPTIONS.
  cuisine_preferences: string[];
  country_region: string | null;
  favorite_foods: string[];
  goals: NutritionGoal[];
  // Redesign Nutrition spec, Goals tab — optional user-set daily
  // targets, same nullable-override pattern as hydration_target_ml
  // (null means "no goal set," never an auto-computed prescription).
  calorie_target: number | null;
  protein_target_g: number | null;
  carbs_target_g: number | null;
  fat_target_g: number | null;
  created_at: string;
  updated_at: string;
}

// Redesign Nutrition spec, Section 17 — individual food items,
// distinct from `meals` (composed dishes). Global/curated content,
// same read-all-authenticated pattern as Meal.
export interface Food {
  id: string;
  name_en: string;
  name_fr: string;
  common_names: string[];
  cuisine: Cuisine;
  country_region: string | null;
  category: FoodCategory;
  serving_size_en: string | null;
  serving_size_fr: string | null;
  calories_kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  added_sugar_g: number | null;
  sodium_mg: number | null;
  saturated_fat_g: number | null;
  preparation_method_en: string | null;
  preparation_method_fr: string | null;
  health_tags: string[];
  classification: FoodClassification;
  classification_reason_en: string | null;
  classification_reason_fr: string | null;
  created_at: string;
  updated_at: string;
}

export type HydrationUnit = "L" | "mL" | "fl_oz";
// Deliberately excludes any alcoholic option — alcohol is never
// logged toward hydration (Section 28/34).
export type HydrationBeverageType = "water" | "sparkling_water" | "unsweetened_tea" | "coffee" | "other";

export interface HydrationLogEntry {
  id: string;
  user_id: string;
  date: string;
  beverage_type: HydrationBeverageType;
  amount_ml: number;
  created_at: string;
}

export type ShoppingListCategory =
  | "vegetables"
  | "fruits"
  | "fish"
  | "protein"
  | "grains"
  | "legumes"
  | "nuts_seeds"
  | "seasonings"
  | "dairy"
  | "other";

export interface ShoppingListItem {
  id: string;
  user_id: string;
  name: string;
  category: ShoppingListCategory;
  purchased: boolean;
  source: string | null;
  created_at: string;
}
