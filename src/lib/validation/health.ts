import { z } from "zod";

// Server-side validation per Spec Section 30 ("Validate every write on
// the server") and Section 43 ("Use TypeScript types and server-side
// validation"). Client forms may also use these for early feedback, but
// the API route re-validates — never trust client-side checks alone.

// category is deliberately not a client-supplied field — it's derived
// server-side from the selected test_definition (services/health/labs.ts,
// createLabResult) so it can never drift from the actual test's category.
const labResultBaseSchema = z.object({
  test_definition_id: z.string().uuid(),
  value_numeric: z.number().finite().optional(),
  value_text: z.string().min(1).optional(),
  unit: z.string().optional(),
  reference_low: z.number().optional(),
  reference_high: z.number().optional(),
  reference_text: z.string().optional(),
  result_status: z.enum(["normal", "low", "high", "critical", "abnormal"]).optional(),
  collection_date: z.string().date(),
  result_date: z.string().date().optional(),
  ordering_provider: z.string().optional(),
  facility: z.string().optional(),
  source_document_id: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const labResultInputSchema = labResultBaseSchema.refine(
  (v) => v.value_numeric !== undefined || v.value_text !== undefined,
  { message: "Either value_numeric or value_text is required" }
);

// PATCH: every field optional, and no numeric-or-text refinement — an
// edit may only be touching e.g. notes, so it shouldn't have to resend
// the value at all.
export const labResultUpdateSchema = labResultBaseSchema.partial();
export type LabResultUpdateInput = z.infer<typeof labResultUpdateSchema>;

export type LabResultInput = z.infer<typeof labResultInputSchema>;

// Expand Lab Test Selection spec, Section 13/14 — a user creating
// their own custom test via "+ Add other test." name is stored as-is
// into both name_en/name_fr (Section 21: "do not translate user-created
// custom test names automatically"). category defaults to "other" when
// not specified, matching the picker's own default.
export const customTestDefinitionInputSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().max(50).optional(),
  category: z
    .enum(["hepatitis_b", "liver", "kidney_renal", "blood_cbc", "metabolic", "thyroid", "iron_nutrition", "inflammation_immune", "pancreas", "cardiovascular", "other"])
    .default("other"),
  default_unit: z.string().max(50).optional(),
});

export type CustomTestDefinitionInput = z.infer<typeof customTestDefinitionInputSchema>;

export const conditionInputSchema = z.object({
  name: z.string().min(1).max(200),
  diagnosis_date: z.string().date().optional(),
  status: z.enum(["active", "monitoring", "resolved"]).default("active"),
  description: z.string().optional(),
  provider_reference: z.string().optional(),
  notes: z.string().optional(),
});

export type ConditionInput = z.infer<typeof conditionInputSchema>;

export const conditionUpdateSchema = conditionInputSchema.partial();
export type ConditionUpdateInput = z.infer<typeof conditionUpdateSchema>;

export const medicationInputSchema = z.object({
  name: z.string().min(1).max(200),
  dose: z.string().optional(),
  unit: z.string().optional(),
  frequency: z.string().optional(),
  route: z.string().optional(),
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
  status: z.enum(["active", "discontinued", "planned"]).default("active"),
  prescriber: z.string().optional(),
  reason: z.string().optional(),
  instructions: z.string().optional(),
  related_condition_id: z.string().uuid().optional(),
});

export type MedicationInput = z.infer<typeof medicationInputSchema>;

export const medicationUpdateSchema = medicationInputSchema.partial();
export type MedicationUpdateInput = z.infer<typeof medicationUpdateSchema>;

export const appointmentInputSchema = z.object({
  provider_name: z.string().min(1).max(200),
  specialty: z.string().optional(),
  appointment_type: z.string().optional(),
  date_time: z.string().datetime().or(z.string().min(1)),
  location: z.string().optional(),
  status: z.enum(["scheduled", "completed", "cancelled", "no_show"]).default("scheduled"),
  preparation_notes: z.string().optional(),
  clinician_instructions: z.string().optional(),
  follow_up_date: z.string().date().optional(),
  related_condition_id: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export type AppointmentInput = z.infer<typeof appointmentInputSchema>;

// PATCH: every field optional (an edit may touch just one field), but
// still validated the same way as create — never trust the client just
// because it's an update.
export const appointmentUpdateSchema = appointmentInputSchema.partial();
export type AppointmentUpdateInput = z.infer<typeof appointmentUpdateSchema>;

export const symptomEntryInputSchema = z.object({
  symptom: z.string().min(1).max(200),
  severity: z.number().int().min(1).max(10).optional(),
  onset: z.string().optional(),
  duration: z.string().optional(),
  frequency: z.string().optional(),
  context: z.string().optional(),
  notes: z.string().optional(),
  related_condition_id: z.string().uuid().optional(),
  appointment_reference_id: z.string().uuid().optional(),
});

export type SymptomEntryInput = z.infer<typeof symptomEntryInputSchema>;

export const symptomEntryUpdateSchema = symptomEntryInputSchema.partial();
export type SymptomEntryUpdateInput = z.infer<typeof symptomEntryUpdateSchema>;

export const bodyMetricInputSchema = z.object({
  metric_type: z.enum(["weight", "height", "bmi", "waist_circumference", "body_fat_percentage"]),
  value: z.number().finite(),
  unit: z.string().min(1),
  measured_at: z.string().datetime().or(z.string().min(1)),
  source: z.string().optional(),
  notes: z.string().optional(),
  entry_source: z.enum(["manual", "medical_visit", "imported", "other"]).optional(),
  source_document_id: z.string().uuid().optional(),
  related_appointment_id: z.string().uuid().optional(),
  related_condition_id: z.string().uuid().optional(),
  is_calculated: z.boolean().optional(),
});

export type BodyMetricInput = z.infer<typeof bodyMetricInputSchema>;

export const bodyMetricUpdateSchema = bodyMetricInputSchema.partial();
export type BodyMetricUpdateInput = z.infer<typeof bodyMetricUpdateSchema>;

// Base fields shared by create/update; the create schema adds the
// per-vital_type "required fields" refinement (mirrors labResult's
// base-schema + refine split above), the update (PATCH) schema stays a
// plain partial since an edit may only touch e.g. notes.
const vitalBaseSchema = z.object({
  vital_type: z.enum(["blood_pressure", "heart_rate", "temperature", "spo2", "respiratory_rate"]).default("blood_pressure"),
  recorded_at: z.string().datetime().or(z.string().min(1)),
  systolic: z.number().finite().optional(),
  diastolic: z.number().finite().optional(),
  pulse: z.number().finite().optional(),
  position: z.enum(["sitting", "standing", "lying"]).optional(),
  arm: z.enum(["left", "right"]).optional(),
  value: z.number().finite().optional(),
  unit: z.string().optional(),
  notes: z.string().optional(),
  source: z.enum(["manual", "medical_visit", "imported", "other"]).optional(),
  source_document_id: z.string().uuid().optional(),
  related_appointment_id: z.string().uuid().optional(),
  related_condition_id: z.string().uuid().optional(),
});

export const vitalInputSchema = vitalBaseSchema
  .refine(
    (v) => v.vital_type !== "blood_pressure" || (v.systolic !== undefined && v.diastolic !== undefined && v.pulse !== undefined),
    { message: "Systolic, diastolic, and pulse are required for blood pressure readings" }
  )
  .refine((v) => v.vital_type !== "heart_rate" || v.pulse !== undefined, {
    message: "Pulse is required for heart rate readings",
  })
  .refine((v) => !["temperature", "spo2", "respiratory_rate"].includes(v.vital_type) || v.value !== undefined, {
    message: "A value is required for this vital type",
  });

export type VitalInput = z.infer<typeof vitalInputSchema>;

export const vitalUpdateSchema = vitalBaseSchema.partial();
export type VitalUpdateInput = z.infer<typeof vitalUpdateSchema>;

// The combined "Record Vitals" flow (Spec Section 4): one submission,
// any subset of measurements from the same visit. Deliberately more
// permissive per-field than vitalInputSchema's single-type refinements
// above (e.g. blood pressure here doesn't require a pulse) — Section 4:
// "Do not require the user to fill every field. Only save measurements
// that were actually provided." Heart rate is one shared field: if
// systolic/diastolic are also present it becomes that reading's pulse
// (never a second, duplicate standalone heart_rate row for the same
// visit — see services/health/vitals-session.ts).
export const recordVitalsInputSchema = z
  .object({
    recorded_at: z.string().datetime().or(z.string().min(1)),
    systolic: z.number().finite().optional(),
    diastolic: z.number().finite().optional(),
    heart_rate: z.number().finite().optional(),
    temperature_value: z.number().finite().optional(),
    temperature_unit: z.enum(["°C", "°F"]).default("°C"),
    respiratory_rate: z.number().finite().optional(),
    spo2: z.number().finite().optional(),
    weight_value: z.number().finite().optional(),
    weight_unit: z.enum(["kg", "lb"]).default("kg"),
    height_value: z.number().finite().optional(),
    height_unit: z.enum(["cm", "in"]).default("cm"),
    notes: z.string().optional(),
    source: z.enum(["manual", "medical_visit", "imported", "other"]).default("manual"),
    related_appointment_id: z.string().uuid().optional(),
    related_condition_id: z.string().uuid().optional(),
    source_document_id: z.string().uuid().optional(),
  })
  .refine((v) => (v.systolic !== undefined) === (v.diastolic !== undefined), {
    message: "Systolic and diastolic must be provided together",
  })
  .refine(
    (v) =>
      v.systolic !== undefined ||
      v.heart_rate !== undefined ||
      v.temperature_value !== undefined ||
      v.respiratory_rate !== undefined ||
      v.spo2 !== undefined ||
      v.weight_value !== undefined ||
      v.height_value !== undefined,
    { message: "At least one measurement is required" }
  );

export type RecordVitalsInput = z.infer<typeof recordVitalsInputSchema>;

export const workoutInputSchema = z.object({
  workout_type: z.enum(["walking", "running", "cycling", "strength", "other"]),
  status: z.enum(["completed", "scheduled", "cancelled"]).default("completed"),
  started_at: z.string().datetime().or(z.string().min(1)),
  duration_minutes: z.number().int().positive().optional(),
  distance_value: z.number().finite().positive().optional(),
  distance_unit: z.string().optional(),
  calories: z.number().finite().nonnegative().optional(),
  steps: z.number().int().nonnegative().optional(),
  sets: z.number().int().positive().optional(),
  reps: z.number().int().positive().optional(),
  weight_resistance: z.number().finite().nonnegative().optional(),
  weight_unit: z.string().optional(),
  notes: z.string().optional(),
});

export type WorkoutInput = z.infer<typeof workoutInputSchema>;

export const workoutUpdateSchema = workoutInputSchema.partial();
export type WorkoutUpdateInput = z.infer<typeof workoutUpdateSchema>;

// Universal Exercise & Activity Library, Section 8/20-style
// preferences — every field optional, never a medical prescription.
export const exercisePreferencesInputSchema = z.object({
  equipment: z.array(z.enum(["none", "home_equipment", "resistance_bands", "dumbbells", "kettlebells", "full_gym", "other"])).optional(),
  activity_preferences: z
    .array(z.enum(["walking", "running", "cycling", "swimming", "gym", "home_workout", "sports", "yoga_pilates", "mobility", "other"]))
    .optional(),
  fitness_level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  available_time: z.enum(["quick", "moderate", "extended"]).optional(),
  environment: z.enum(["home_no_equipment", "outdoor", "gym", "limited_mobility", "small_space", "flexible"]).optional(),
  custom_activities: z.array(z.string().max(50)).optional(),
});
export type ExercisePreferencesInput = z.infer<typeof exercisePreferencesInputSchema>;

export const mealLogEntryInputSchema = z.object({
  date: z.string().date(),
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  description: z.string().min(1),
  notes: z.string().optional(),
  calories: z.number().nonnegative().finite().optional(),
  protein_g: z.number().nonnegative().finite().optional(),
  carbs_g: z.number().nonnegative().finite().optional(),
  fat_g: z.number().nonnegative().finite().optional(),
  fiber_g: z.number().nonnegative().finite().optional(),
  sugar_g: z.number().nonnegative().finite().optional(),
  sodium_mg: z.number().nonnegative().finite().optional(),
  fruit_veg_g: z.number().nonnegative().finite().optional(),
  fruit_veg_portions: z.number().nonnegative().finite().optional(),
});

export type MealLogEntryInput = z.infer<typeof mealLogEntryInputSchema>;

export const mealLogEntryUpdateSchema = mealLogEntryInputSchema.partial();
export type MealLogEntryUpdateInput = z.infer<typeof mealLogEntryUpdateSchema>;

export const nutritionRestrictionInputSchema = z.object({
  restriction: z.string().min(1).max(200),
  source: z.enum(["clinician", "self_reported"]),
  related_condition_id: z.string().uuid().optional(),
});

export type NutritionRestrictionInput = z.infer<typeof nutritionRestrictionInputSchema>;

export const nutritionRestrictionUpdateSchema = nutritionRestrictionInputSchema.partial();
export type NutritionRestrictionUpdateInput = z.infer<typeof nutritionRestrictionUpdateSchema>;

// Senegal-Focused Liver-Conscious Nutrition System — Section 20:
// personalization only, every field optional (a user may set just one
// preference), never validated as a medical prescription.
export const nutritionPreferencesInputSchema = z.object({
  // Superseded by cuisine_preferences below (kept accepted, unused by
  // the new UI, for backward compatibility with the old single-select
  // field — see the comment on NutritionPreferences.cuisine).
  cuisine: z.string().min(1).max(50).optional(),
  goal: z
    .enum([
      "balanced_eating",
      "increase_fiber",
      "reduce_sodium",
      "reduce_free_sugar",
      "increase_vegetables",
      "maintain_weight",
      "gain_weight",
      "lose_weight",
    ])
    .optional(),
  diet_preferences: z.array(z.string().max(50)).optional(),
  dislikes: z.array(z.string().max(50)).optional(),
  allergies: z.array(z.string().max(50)).optional(),
  budget: z.enum(["low", "moderate", "flexible"]).optional(),
  cooking_time: z.enum(["quick", "moderate", "extended"]).optional(),
  hydration_unit: z.enum(["L", "mL", "fl_oz"]).optional(),
  hydration_target_ml: z.number().positive().finite().optional(),
  // Redesign Nutrition spec, Goals tab — optional, user-entered only.
  calorie_target: z.number().positive().finite().optional(),
  protein_target_g: z.number().positive().finite().optional(),
  carbs_target_g: z.number().positive().finite().optional(),
  fat_target_g: z.number().positive().finite().optional(),
  // Redesign Nutrition spec, Section 16/17 — cuisine is intentionally
  // NOT a fixed zod enum here either: the whole point of making
  // foods.cuisine/meals.cuisine plain text (migration 0030) is that a
  // new cuisine never requires a code change anywhere, including this
  // validator.
  cuisine_preferences: z.array(z.string().min(1).max(50)).max(20).optional(),
  country_region: z.string().max(100).optional(),
  favorite_foods: z.array(z.string().max(100)).max(50).optional(),
  goals: z
    .array(
      z.enum([
        "increase_vegetables",
        "improve_hydration",
        "increase_fiber",
        "reduce_sodium",
        "reduce_added_sugar",
        "increase_protein",
        "weight_management",
        "general_healthy_eating",
      ])
    )
    .optional(),
});
export type NutritionPreferencesInput = z.infer<typeof nutritionPreferencesInputSchema>;

// Hydration & Drinks spec, Section 28 — beverage_type intentionally
// excludes any alcoholic option (alcohol is never logged as
// hydration).
export const hydrationLogEntryInputSchema = z.object({
  date: z.string().date(),
  beverage_type: z.enum(["water", "sparkling_water", "unsweetened_tea", "coffee", "other"]),
  amount_ml: z.number().positive().finite(),
});
export type HydrationLogEntryInput = z.infer<typeof hydrationLogEntryInputSchema>;

export const shoppingListItemInputSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.enum(["vegetables", "fruits", "fish", "protein", "grains", "legumes", "nuts_seeds", "seasonings", "dairy", "other"]),
  source: z.string().max(120).optional(),
});
export type ShoppingListItemInput = z.infer<typeof shoppingListItemInputSchema>;

export const shoppingListItemsInputSchema = z.array(shoppingListItemInputSchema).min(1);

export const shoppingListItemUpdateSchema = z.object({ purchased: z.boolean() });

export const documentInputSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.string().min(1),
  category: z.string().optional(),
  storage_path: z.string().min(1),
  mime_type: z.string().min(1),
  file_size: z.number().int().nonnegative(),
  document_date: z.string().date().optional(),
  provider: z.string().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).default([]),
  related_condition_id: z.string().uuid().optional(),
  related_appointment_id: z.string().uuid().optional(),
  related_lab_result_ids: z.array(z.string().uuid()).default([]),
});

export type DocumentInput = z.infer<typeof documentInputSchema>;

// The file itself is fixed at upload time (same reasoning as Personal
// Documents' update schema) — only metadata can change afterward.
// pinned is toggled through this same PATCH (a dedicated Pin action
// just sends { pinned: true/false }), matching the Personal Documents
// pattern exactly.
export const documentUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.string().min(1).optional(),
  category: z.string().nullable().optional(),
  document_date: z.string().date().nullable().optional(),
  provider: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  related_condition_id: z.string().uuid().nullable().optional(),
  related_appointment_id: z.string().uuid().nullable().optional(),
  related_lab_result_ids: z.array(z.string().uuid()).optional(),
  pinned: z.boolean().optional(),
});
export type DocumentUpdateInput = z.infer<typeof documentUpdateSchema>;

// test_type is intentionally an open string, not z.enum(...) — see the
// comment on DiagnosticTest in types/health/entities.ts.
export const diagnosticTestInputSchema = z.object({
  test_type: z.string().min(1).max(100),
  category: z.enum(["imaging", "cardiology", "pathology", "microbiology", "other"]),
  body_part: z.string().optional(),
  study_date: z.string().date(),
  facility: z.string().optional(),
  provider: z.string().optional(),
  indication: z.string().optional(),
  findings: z.string().optional(),
  impression: z.string().optional(),
  measurements: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
  abnormalities: z.string().optional(),
  follow_up: z.string().optional(),
  notes: z.string().optional(),
  related_condition_id: z.string().uuid().optional(),
  source_document_id: z.string().uuid().optional(),
});

export type DiagnosticTestInput = z.infer<typeof diagnosticTestInputSchema>;

export const diagnosticTestUpdateSchema = diagnosticTestInputSchema.partial();
export type DiagnosticTestUpdateInput = z.infer<typeof diagnosticTestUpdateSchema>;

export const monitoringPlanInputSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  status: z.enum(["active", "paused", "completed", "archived"]).default("active"),
  condition_id: z.string().uuid().optional(),
  clinician_notes: z.string().optional(),
});

export type MonitoringPlanInput = z.infer<typeof monitoringPlanInputSchema>;

// interval_value/interval_unit must both be present or both absent — an
// item either has a computable recurrence or it doesn't (mirrors the
// monitoring_items_interval_pair CHECK constraint in the migration).
export const monitoringItemInputSchema = z
  .object({
    monitoring_plan_id: z.string().uuid(),
    name: z.string().min(1).max(200),
    category: z.string().optional(),
    test_type: z.string().optional(),
    interval_value: z.number().int().positive().optional(),
    interval_unit: z.enum(["days", "weeks", "months", "years"]).optional(),
    frequency_note: z.string().optional(),
    next_due_at: z.string().date().optional(),
    source: z.enum(["guideline", "clinician", "user"]).default("user"),
    guideline_id: z.string().uuid().optional(),
    notes: z.string().optional(),
  })
  .refine((v) => (v.interval_value === undefined) === (v.interval_unit === undefined), {
    message: "interval_value and interval_unit must be provided together",
  });

export type MonitoringItemInput = z.infer<typeof monitoringItemInputSchema>;

export const monitoringItemCompletionSchema = z.object({
  completed_at: z.string().date().optional(),
  notes: z.string().optional(),
});

export type MonitoringItemCompletionInput = z.infer<typeof monitoringItemCompletionSchema>;

export const monitoringItemNextDueUpdateSchema = z.object({
  next_due_at: z.string().date(),
});

export type MonitoringItemNextDueUpdateInput = z.infer<typeof monitoringItemNextDueUpdateSchema>;
