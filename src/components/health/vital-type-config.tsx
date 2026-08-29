import { HeartPulse, Activity, Scale, Ruler, Calculator, Wind, Droplet, Thermometer, type LucideIcon } from "lucide-react";

// Single source of truth for every vital type's icon/default unit,
// shared by the compact latest-reading cards, the combined Record
// Vitals form's live preview, and the generic history list — so adding
// a new vital type later means editing this one map, not hunting
// through every consumer.

export type VitalPickerType = "blood_pressure" | "heart_rate" | "weight" | "height" | "bmi" | "spo2" | "temperature" | "respiratory_rate";

// heart_rate/spo2/temperature/respiratory_rate write to the `vitals`
// table (services/health/vitals.ts); weight/height/bmi write to the
// already-existing, unchanged `body_metrics` table (services/health/
// body-metrics.ts) — reusing it rather than duplicating weight/height/
// BMI storage. blood_pressure also writes to `vitals` but has its own
// dedicated fields/form (BloodPressureForm), not the generic
// single-value shape.
export type SingleValueVitalType = "heart_rate" | "spo2" | "temperature" | "respiratory_rate";
export const SINGLE_VALUE_VITAL_TYPES: SingleValueVitalType[] = ["heart_rate", "spo2", "temperature", "respiratory_rate"];

// heart_rate reuses the `pulse` column (same measurement a blood
// pressure reading's pulse is stored in — see 0014_vitals.sql); the
// other single-value types use the generic `value` column.
export const SINGLE_VALUE_FIELD_KEY: Record<SingleValueVitalType, "pulse" | "value"> = {
  heart_rate: "pulse",
  spo2: "value",
  temperature: "value",
  respiratory_rate: "value",
};

export const SINGLE_VALUE_DEFAULT_UNIT: Record<SingleValueVitalType, string> = {
  heart_rate: "bpm",
  spo2: "%",
  temperature: "°F",
  respiratory_rate: "breaths/min",
};

// Blood Pressure gets HeartPulse per the Vitals spec's icon list;
// standalone Heart Rate (a separate reading with no BP cuff — e.g. a
// pulse oximeter check) gets Activity instead so the two don't render
// as the same icon on the same page. SpO2 was specced as "Lungs", which
// doesn't exist in the installed lucide-react version — Droplet (the
// common blood-oxygen convention) substitutes, distinct from
// Respiratory Rate's Wind.
export const VITAL_TYPE_ICON: Record<VitalPickerType, LucideIcon> = {
  blood_pressure: HeartPulse,
  heart_rate: Activity,
  weight: Scale,
  height: Ruler,
  bmi: Calculator,
  spo2: Droplet,
  temperature: Thermometer,
  respiratory_rate: Wind,
};
