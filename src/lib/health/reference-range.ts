import type { LabResult, LabResultStatusKey, ReferenceStandard } from "@/types/health/entities";
import { getLabResultLevel } from "@/lib/health/lab-level";

// Lab-specific side of the Universal Reference System — the 3-tier
// priority:
//   1. Laboratory-provided range (already stored on the individual
//      LabResult — always wins, never overridden).
//   2. Trusted external source (the shared reference_standards
//      catalog) — used ONLY when the lab didn't provide one.
//   3. "Reference range not available" — never invented.
//
// The generic (non-lab) side — single-value vitals, BMI categories,
// blood pressure categories — lives in reference-standards.ts, which
// this file's types intentionally mirror so <ReferenceInfo/> can render
// either through one shared shape.
//
// Pure/client-safe — no Supabase import — so both server pages and
// client components (cards, history table) can call it identically.

export type ReferenceRangeDisplay =
  | { kind: "laboratory"; low: number | null; high: number | null; text: string | null }
  | { kind: "external-single"; range: ReferenceStandard }
  // More than one population variant exists and LifeOS has no
  // structured patient demographics to pick between them (Section 5) —
  // show every variant, honestly labeled, rather than guessing one.
  | { kind: "external-multiple"; ranges: ReferenceStandard[] }
  | { kind: "unavailable" };

export function resolveReferenceRangeDisplay(
  result: Pick<LabResult, "reference_low" | "reference_high" | "reference_text">,
  externalRanges: ReferenceStandard[]
): ReferenceRangeDisplay {
  if (result.reference_low !== null || result.reference_high !== null || result.reference_text) {
    return { kind: "laboratory", low: result.reference_low, high: result.reference_high, text: result.reference_text };
  }
  const [only] = externalRanges;
  if (externalRanges.length === 1 && only) return { kind: "external-single", range: only };
  if (externalRanges.length > 1) return { kind: "external-multiple", ranges: externalRanges };
  return { kind: "unavailable" };
}

// "reported" = the source lab explicitly stated a status, preserved
// verbatim (never overridden). "laboratory"/"external" = computed from
// whichever range was used above. "none" = not computable — render as
// plain text, never a colored pill (Section 6: never imply a diagnosis
// from an absence of data).
export type LabResultStatusBasis = "reported" | "laboratory" | "external" | "none";

export interface ResolvedLabResultStatus {
  status: LabResultStatusKey | null;
  basis: LabResultStatusBasis;
}

export function resolveLabResultStatusWithBasis(
  result: Pick<LabResult, "value_numeric" | "reference_low" | "reference_high" | "result_status">,
  externalRanges: ReferenceStandard[]
): ResolvedLabResultStatus {
  if (result.result_status) return { status: result.result_status, basis: "reported" };

  const labLevel = getLabResultLevel(result);
  if (labLevel !== "unknown") return { status: labLevel, basis: "laboratory" };

  // Only fall back to an external range for STATUS when there's exactly
  // one unambiguous general-population value — Section 5 forbids
  // guessing which population variant applies, so an ambiguous
  // (multi-population) external match yields no computed status at all.
  const [only] = externalRanges;
  if (result.value_numeric !== null && externalRanges.length === 1 && only) {
    const level = getLabResultLevel({
      value_numeric: result.value_numeric,
      reference_low: only.reference_low,
      reference_high: only.reference_high,
    });
    if (level !== "unknown") return { status: level, basis: "external" };
  }

  return { status: null, basis: "none" };
}
