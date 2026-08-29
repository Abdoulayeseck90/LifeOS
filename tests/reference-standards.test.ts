import { describe, it, expect } from "vitest";
import { resolveGenericReference, resolveBmiCategory, resolveBloodPressureCategory, referenceStandardRangeText } from "@/lib/health/reference-standards";
import type { ReferenceStandard } from "@/types/health/entities";

function standard(overrides: Partial<ReferenceStandard> = {}): ReferenceStandard {
  return {
    id: "std-1",
    test_definition_id: null,
    metric_key: "vital:heart_rate",
    reference_kind: "expected_range",
    reference_low: 60,
    reference_high: 100,
    reference_category: null,
    component: null,
    unit: "bpm",
    applicable_population: "General resting adult",
    source_name: "Cleveland Clinic",
    source_url: "https://my.clevelandclinic.org/health/articles/10881-vital-signs",
    source_type: "academic_institution",
    source_version: null,
    guideline_version: null,
    retrieved_at: "2026-08-27",
    created_at: "2026-08-27T00:00:00Z",
    updated_at: "2026-08-27T00:00:00Z",
    ...overrides,
  };
}

const BMI_STANDARDS: ReferenceStandard[] = [
  standard({ id: "under", metric_key: "body_metric:bmi", reference_low: null, reference_high: 18.49, reference_category: "Underweight", unit: "kg/m²", source_name: "CDC" }),
  standard({ id: "healthy", metric_key: "body_metric:bmi", reference_low: 18.5, reference_high: 24.99, reference_category: "Healthy weight", unit: "kg/m²", source_name: "CDC" }),
  standard({ id: "over", metric_key: "body_metric:bmi", reference_low: 25, reference_high: 29.99, reference_category: "Overweight", unit: "kg/m²", source_name: "CDC" }),
  standard({ id: "obese", metric_key: "body_metric:bmi", reference_low: 30, reference_high: null, reference_category: "Obesity", unit: "kg/m²", source_name: "CDC" }),
];

const BP_STANDARDS: ReferenceStandard[] = [
  standard({ id: "n-sys", metric_key: "vital:blood_pressure", component: "systolic", reference_low: null, reference_high: 119, reference_category: "Normal", source_name: "AHA" }),
  standard({ id: "n-dia", metric_key: "vital:blood_pressure", component: "diastolic", reference_low: null, reference_high: 79, reference_category: "Normal", source_name: "AHA" }),
  standard({ id: "e-sys", metric_key: "vital:blood_pressure", component: "systolic", reference_low: 120, reference_high: 129, reference_category: "Elevated", source_name: "AHA" }),
  standard({ id: "e-dia", metric_key: "vital:blood_pressure", component: "diastolic", reference_low: null, reference_high: 79, reference_category: "Elevated", source_name: "AHA" }),
  standard({ id: "s1-sys", metric_key: "vital:blood_pressure", component: "systolic", reference_low: 130, reference_high: 139, reference_category: "Stage 1 Hypertension", source_name: "AHA" }),
  standard({ id: "s1-dia", metric_key: "vital:blood_pressure", component: "diastolic", reference_low: 80, reference_high: 89, reference_category: "Stage 1 Hypertension", source_name: "AHA" }),
  standard({ id: "s2-sys", metric_key: "vital:blood_pressure", component: "systolic", reference_low: 140, reference_high: null, reference_category: "Stage 2 Hypertension", source_name: "AHA" }),
  standard({ id: "s2-dia", metric_key: "vital:blood_pressure", component: "diastolic", reference_low: 90, reference_high: null, reference_category: "Stage 2 Hypertension", source_name: "AHA" }),
  standard({ id: "crisis-sys", metric_key: "vital:blood_pressure", component: "systolic", reference_low: 181, reference_high: null, reference_category: "Hypertensive Crisis", source_name: "AHA" }),
  standard({ id: "crisis-dia", metric_key: "vital:blood_pressure", component: "diastolic", reference_low: 121, reference_high: null, reference_category: "Hypertensive Crisis", source_name: "AHA" }),
];

describe("resolveGenericReference", () => {
  it("uses the single unambiguous standard", () => {
    const result = resolveGenericReference([standard()]);
    expect(result.kind).toBe("standard");
  });

  it("never guesses between multiple candidates (e.g. unmatched temperature units)", () => {
    const result = resolveGenericReference([standard({ unit: "°C" }), standard({ unit: "°F" })]);
    expect(result).toEqual({ kind: "unavailable" });
  });

  it("returns unavailable when there's nothing to show", () => {
    expect(resolveGenericReference([])).toEqual({ kind: "unavailable" });
  });
});

describe("referenceStandardRangeText", () => {
  it("formats a two-sided range", () => {
    expect(referenceStandardRangeText(standard({ reference_low: 60, reference_high: 100 }))).toBe("60–100");
  });

  it("formats a lower-bound-only value", () => {
    expect(referenceStandardRangeText(standard({ reference_low: 30, reference_high: null }))).toBe("≥ 30");
  });
});

describe("resolveBmiCategory", () => {
  it("classifies a normal-weight BMI", () => {
    const result = resolveBmiCategory(22.4, BMI_STANDARDS);
    expect(result?.category).toBe("Healthy weight");
  });

  it("classifies an underweight BMI (open-ended low bound)", () => {
    expect(resolveBmiCategory(17.0, BMI_STANDARDS)?.category).toBe("Underweight");
  });

  it("classifies an obesity-range BMI (open-ended high bound)", () => {
    expect(resolveBmiCategory(35.2, BMI_STANDARDS)?.category).toBe("Obesity");
  });

  it("never invents a category when no bracket matches", () => {
    expect(resolveBmiCategory(22.4, [])).toBeNull();
  });
});

describe("resolveBloodPressureCategory", () => {
  it("classifies a normal reading", () => {
    expect(resolveBloodPressureCategory(115, 75, BP_STANDARDS)?.category).toBe("Normal");
  });

  it("takes the higher category when systolic and diastolic disagree", () => {
    // Systolic 125 -> Elevated; diastolic 85 -> Stage 1. Stage 1 wins.
    expect(resolveBloodPressureCategory(125, 85, BP_STANDARDS)?.category).toBe("Stage 1 Hypertension");
  });

  it("isolated systolic hypertension still resolves to the systolic-implied stage", () => {
    // Systolic 145 -> Stage 2; diastolic 70 -> Normal. Stage 2 wins.
    expect(resolveBloodPressureCategory(145, 70, BP_STANDARDS)?.category).toBe("Stage 2 Hypertension");
  });

  it("resolves the more specific bracket when open-ended ranges overlap (Stage 2 vs Crisis)", () => {
    expect(resolveBloodPressureCategory(190, 95, BP_STANDARDS)?.category).toBe("Hypertensive Crisis");
  });

  it("never invents a category when no bracket matches", () => {
    expect(resolveBloodPressureCategory(120, 80, [])).toBeNull();
  });
});
