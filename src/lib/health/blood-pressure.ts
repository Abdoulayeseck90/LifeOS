// Pure, client-safe classification — kept out of services/health/vitals.ts
// (server-only Supabase import) for the same reason as lib/health/lab-level.ts.
//
// Deliberately NOT a clinical/diagnostic classification (no "hypertension"
// stages, no fixed population thresholds) — Master Redesign's explicit
// health-UX requirement is to never diagnose from a single reading. This
// only compares a reading against the user's OWN recent average, and
// labels it "outside_range" (a personal-baseline signal) rather than a
// medical category. With fewer than 3 prior readings there isn't enough
// personal history to compare against, so the status is null and no
// badge should be rendered.
export type BloodPressureStatus = "normal" | "outside_range";

const SYSTOLIC_BAND = 15;
const DIASTOLIC_BAND = 10;
const BASELINE_SAMPLE_SIZE = 10;

export function getBloodPressureStatus(
  reading: { systolic: number; diastolic: number },
  priorReadings: { systolic: number; diastolic: number }[]
): BloodPressureStatus | null {
  if (priorReadings.length < 3) return null;

  const baseline = priorReadings.slice(0, BASELINE_SAMPLE_SIZE);
  const average = (nums: number[]) => nums.reduce((sum, n) => sum + n, 0) / nums.length;
  const avgSystolic = average(baseline.map((r) => r.systolic));
  const avgDiastolic = average(baseline.map((r) => r.diastolic));

  if (Math.abs(reading.systolic - avgSystolic) > SYSTOLIC_BAND || Math.abs(reading.diastolic - avgDiastolic) > DIASTOLIC_BAND) {
    return "outside_range";
  }
  return "normal";
}
