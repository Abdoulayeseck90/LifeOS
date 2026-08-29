import type { ReferenceStandard } from "@/types/health/entities";

// The non-lab side of the Universal Reference System (see
// reference-range.ts for the lab-specific 3-tier priority logic).
// Single-value vitals (Heart Rate, Respiratory Rate, Temperature,
// SpO2) have no per-measurement "provided" range to prioritize over —
// there's only ever the shared reference_standards catalog, so this is
// intentionally simpler than the lab resolver. Pure/client-safe — no
// Supabase import.

// Section 4-7: these vitals show the reference alongside the value but
// never a computed Low/Normal/High pill — only Blood Pressure and BMI
// get an actual category classification (below), matching the spec's
// own worked examples.
export type GenericReferenceDisplay = { kind: "standard"; standard: ReferenceStandard } | { kind: "unavailable" };

// Callers must pre-filter `standards` to the ones that actually apply
// (e.g. Temperature's matching unit) — this never guesses between
// multiple candidates (Section 5: don't guess population/context).
export function resolveGenericReference(standards: ReferenceStandard[]): GenericReferenceDisplay {
  const [only] = standards;
  if (standards.length === 1 && only) return { kind: "standard", standard: only };
  return { kind: "unavailable" };
}

// Picks the most specific matching bracket when brackets can overlap
// at an open ("or higher") end — e.g. Blood Pressure's Stage 2 (140+)
// and Hypertensive Crisis (181+) both match a reading of 190; the
// higher-threshold bracket is the correct/more specific one, not
// whichever happened to come back first from the database.
function findBracket(value: number, rows: ReferenceStandard[]): ReferenceStandard | null {
  const matches = rows.filter(
    (s) => (s.reference_low === null || value >= s.reference_low) && (s.reference_high === null || value <= s.reference_high)
  );
  if (matches.length === 0) return null;
  return matches.reduce((best, current) => {
    const bestLow = best.reference_low ?? Number.NEGATIVE_INFINITY;
    const currentLow = current.reference_low ?? Number.NEGATIVE_INFINITY;
    return currentLow > bestLow ? current : best;
  });
}

// Shared low/high formatting — used by both ReferenceInfo and the
// click-for-details modal so the two never drift apart.
export function referenceStandardRangeText(standard: ReferenceStandard): string {
  if (standard.reference_low !== null && standard.reference_high !== null) return `${standard.reference_low}–${standard.reference_high}`;
  if (standard.reference_low !== null) return `≥ ${standard.reference_low}`;
  if (standard.reference_high !== null) return `≤ ${standard.reference_high}`;
  return "";
}

export interface ResolvedCategory {
  category: string;
  standard: ReferenceStandard;
}

// BMI (Section 8): a named category bracket, not a "normal range" — and
// never age-adjusted (LifeOS has no pediatric BMI standards yet, per
// spec Section 8's own caveat), so this is adult-only and returns null
// rather than guessing when no bracket matches.
export function resolveBmiCategory(bmiValue: number, standards: ReferenceStandard[]): ResolvedCategory | null {
  const match = findBracket(bmiValue, standards);
  if (!match || !match.reference_category) return null;
  return { category: match.reference_category, standard: match };
}

// Blood Pressure (Section 3): AHA's own rule is "you're in the higher
// category based on either your systolic OR diastolic number" — so
// this classifies each dimension independently against its own
// component-tagged rows, then takes whichever dimension implies the
// more severe category. Never invents a category if the seeded
// brackets don't cover the reading.
const BLOOD_PRESSURE_CATEGORY_ORDER = ["Normal", "Elevated", "Stage 1 Hypertension", "Stage 2 Hypertension", "Hypertensive Crisis"];

export function resolveBloodPressureCategory(
  systolic: number,
  diastolic: number,
  standards: ReferenceStandard[]
): ResolvedCategory | null {
  const systolicMatch = findBracket(
    systolic,
    standards.filter((s) => s.component === "systolic")
  );
  const diastolicMatch = findBracket(
    diastolic,
    standards.filter((s) => s.component === "diastolic")
  );

  function rank(standard: ReferenceStandard | null): number {
    if (!standard?.reference_category) return -1;
    return BLOOD_PRESSURE_CATEGORY_ORDER.indexOf(standard.reference_category);
  }

  const winner = rank(systolicMatch) >= rank(diastolicMatch) ? systolicMatch : diastolicMatch;
  if (!winner?.reference_category) return null;

  return { category: winner.reference_category, standard: winner };
}
