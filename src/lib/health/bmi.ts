// Pure BMI math — shared by the combined Record Vitals form (a live
// preview as the user types) and the server-side recordVitalsSession
// service that actually persists the calculated row. BMI = weight(kg) /
// height(m)^2, standard formula; this file only converts units and
// does the division — it never classifies the result (no "normal"/
// "underweight" labeling — Spec Section 10: never invent a clinical
// interpretation LifeOS itself didn't receive from a source record).

const LB_PER_KG = 2.2046226218;
const IN_PER_CM = 0.3937007874;

export function weightToKg(value: number, unit: string): number {
  return unit === "lb" ? value / LB_PER_KG : value;
}

export function heightToMeters(value: number, unit: string): number {
  const cm = unit === "in" ? value / IN_PER_CM : value;
  return cm / 100;
}

// Rounded to 2 decimal places, matching how BMI is conventionally
// reported (e.g. "17.77").
export function computeBmi(weightValue: number, weightUnit: string, heightValue: number, heightUnit: string): number {
  const weightKg = weightToKg(weightValue, weightUnit);
  const heightM = heightToMeters(heightValue, heightUnit);
  const bmi = weightKg / (heightM * heightM);
  return Math.round(bmi * 100) / 100;
}
