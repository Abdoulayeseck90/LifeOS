import type { LabResult, LabResultStatusKey } from "@/types/health/entities";

// Pure, client-safe classification — deliberately kept out of
// services/health/labs.ts (which imports the server-only Supabase
// client via next/headers) so client components like lab-result-card
// can use it without bundling server code. Separate from the stored
// `abnormal_flag` (computeAbnormalFlag in labs.ts decides that on
// write); this is purely for rendering a more specific High/Low/Normal
// pill than the flat abnormal boolean gives. "unknown" — not
// computable — is common and expected: a qualitative (text) result, or
// one with no reference range recorded, and callers are expected to
// skip rendering a pill for it rather than show a hollow "Unknown" tag
// on every such result.
export type LabResultLevel = "high" | "low" | "normal" | "unknown";

export function getLabResultLevel(
  result: Pick<LabResult, "value_numeric" | "reference_low" | "reference_high">
): LabResultLevel {
  const { value_numeric: value, reference_low: low, reference_high: high } = result;
  if (value === null || (low === null && high === null)) return "unknown";
  if (low !== null && value < low) return "low";
  if (high !== null && value > high) return "high";
  return "normal";
}

// The authoritative status for display (Redesign Lab Results Spec,
// Section 6): a status the source lab already stated (result_status)
// always wins — LifeOS never overrides it and never computes "critical"
// itself. Only when nothing was provided does this fall back to the
// numeric reference-range comparison above. Returns null for "not
// specified" (unknown level, no stored status) — callers should render
// that as plain text, never a colored pill.
export type LabResultStatus = LabResultStatusKey;

export function getLabResultStatus(
  result: Pick<LabResult, "value_numeric" | "reference_low" | "reference_high" | "result_status">
): LabResultStatus | null {
  if (result.result_status) return result.result_status;
  const level = getLabResultLevel(result);
  return level === "unknown" ? null : level;
}

// Section 20: Normal is the only "good news" green; Low/High/Abnormal
// all get the same subtle amber/orange treatment (never red — "do not
// use excessive red across the interface"); Critical is the one status
// that gets a strong/solid treatment, and it can only ever come from a
// preserved source value, never a LifeOS computation.
export const LAB_STATUS_BADGE_VARIANT: Record<LabResultStatus, "normal" | "attention" | "critical"> = {
  normal: "normal",
  low: "attention",
  high: "attention",
  abnormal: "attention",
  critical: "critical",
};
