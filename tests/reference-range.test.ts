import { describe, it, expect } from "vitest";
import { resolveReferenceRangeDisplay, resolveLabResultStatusWithBasis } from "@/lib/health/reference-range";
import type { ReferenceStandard } from "@/types/health/entities";

function externalRange(overrides: Partial<ReferenceStandard> = {}): ReferenceStandard {
  return {
    id: "range-1",
    test_definition_id: "test-1",
    metric_key: "lab:AST",
    reference_kind: "reference_range",
    reference_low: 8,
    reference_high: 33,
    reference_category: null,
    component: null,
    unit: "U/L",
    applicable_population: "Adult",
    source_name: "Cleveland Clinic",
    source_url: "https://my.clevelandclinic.org/health/diagnostics/22147-aspartate-transferase-ast",
    source_type: "academic_institution",
    source_version: null,
    guideline_version: null,
    retrieved_at: "2026-08-26",
    created_at: "2026-08-26T00:00:00Z",
    updated_at: "2026-08-26T00:00:00Z",
    ...overrides,
  };
}

describe("resolveReferenceRangeDisplay", () => {
  it("prioritizes a laboratory-provided range even when an external range also exists", () => {
    const display = resolveReferenceRangeDisplay(
      { reference_low: 0, reference_high: 35, reference_text: null },
      [externalRange()]
    );
    expect(display).toEqual({ kind: "laboratory", low: 0, high: 35, text: null });
  });

  it("falls back to a single unambiguous external range when the lab provided none", () => {
    const display = resolveReferenceRangeDisplay({ reference_low: null, reference_high: null, reference_text: null }, [
      externalRange(),
    ]);
    expect(display.kind).toBe("external-single");
  });

  it("shows every population variant rather than guessing when multiple external ranges exist", () => {
    const display = resolveReferenceRangeDisplay({ reference_low: null, reference_high: null, reference_text: null }, [
      externalRange({ id: "male", applicable_population: "Adult male", reference_low: 13, reference_high: 17 }),
      externalRange({ id: "female", applicable_population: "Adult female", reference_low: 11.5, reference_high: 15.5 }),
    ]);
    expect(display.kind).toBe("external-multiple");
    if (display.kind === "external-multiple") expect(display.ranges).toHaveLength(2);
  });

  it("returns 'unavailable' when there is no lab range and no external range", () => {
    const display = resolveReferenceRangeDisplay({ reference_low: null, reference_high: null, reference_text: null }, []);
    expect(display).toEqual({ kind: "unavailable" });
  });

  it("never invents a range — a text-only lab reference is still treated as laboratory-provided", () => {
    const display = resolveReferenceRangeDisplay({ reference_low: null, reference_high: null, reference_text: "See report" }, []);
    expect(display).toEqual({ kind: "laboratory", low: null, high: null, text: "See report" });
  });
});

describe("resolveLabResultStatusWithBasis", () => {
  it("prefers a reported status over anything computed", () => {
    const result = resolveLabResultStatusWithBasis(
      { value_numeric: 20, reference_low: 0, reference_high: 35, result_status: "critical" },
      [externalRange()]
    );
    expect(result).toEqual({ status: "critical", basis: "reported" });
  });

  it("computes from the laboratory range when no status was reported", () => {
    const result = resolveLabResultStatusWithBasis({ value_numeric: 46, reference_low: 0, reference_high: 35, result_status: null }, [
      externalRange(),
    ]);
    expect(result).toEqual({ status: "high", basis: "laboratory" });
  });

  it("falls back to a single unambiguous external range, labeled as such", () => {
    const result = resolveLabResultStatusWithBasis(
      { value_numeric: 46, reference_low: null, reference_high: null, result_status: null },
      [externalRange({ reference_low: 8, reference_high: 33 })]
    );
    expect(result).toEqual({ status: "high", basis: "external" });
  });

  it("never guesses a status from ambiguous multi-population external ranges", () => {
    const result = resolveLabResultStatusWithBasis(
      { value_numeric: 14, reference_low: null, reference_high: null, result_status: null },
      [
        externalRange({ id: "male", reference_low: 13, reference_high: 17 }),
        externalRange({ id: "female", reference_low: 11.5, reference_high: 15.5 }),
      ]
    );
    expect(result).toEqual({ status: null, basis: "none" });
  });

  it("returns 'none' when nothing is computable", () => {
    const result = resolveLabResultStatusWithBasis(
      { value_numeric: null, reference_low: null, reference_high: null, result_status: null },
      []
    );
    expect(result).toEqual({ status: null, basis: "none" });
  });
});
