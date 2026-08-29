import { describe, it, expect } from "vitest";
import { getLabResultLevel, getLabResultStatus, LAB_STATUS_BADGE_VARIANT } from "@/lib/health/lab-level";

describe("getLabResultLevel", () => {
  it("returns 'unknown' for a text-only result", () => {
    expect(getLabResultLevel({ value_numeric: null, reference_low: 0, reference_high: 35 })).toBe("unknown");
  });

  it("returns 'unknown' when no reference range is recorded", () => {
    expect(getLabResultLevel({ value_numeric: 46, reference_low: null, reference_high: null })).toBe("unknown");
  });

  it("returns 'high' when above reference_high", () => {
    expect(getLabResultLevel({ value_numeric: 46, reference_low: 0, reference_high: 35 })).toBe("high");
  });

  it("returns 'low' when below reference_low", () => {
    expect(getLabResultLevel({ value_numeric: 2, reference_low: 4, reference_high: 10 })).toBe("low");
  });

  it("returns 'normal' when within range", () => {
    expect(getLabResultLevel({ value_numeric: 20, reference_low: 0, reference_high: 35 })).toBe("normal");
  });
});

describe("getLabResultStatus", () => {
  it("prefers a stored result_status over the computed level", () => {
    expect(
      getLabResultStatus({ value_numeric: 20, reference_low: 0, reference_high: 35, result_status: "critical" })
    ).toBe("critical");
  });

  it("never invents 'critical' from the numeric range alone", () => {
    expect(
      getLabResultStatus({ value_numeric: 999, reference_low: 0, reference_high: 35, result_status: null })
    ).toBe("high");
  });

  it("falls back to the computed level when no status was provided", () => {
    expect(
      getLabResultStatus({ value_numeric: 46, reference_low: 0, reference_high: 35, result_status: null })
    ).toBe("high");
  });

  it("returns null ('not specified') when neither a status nor a computable level exists", () => {
    expect(
      getLabResultStatus({ value_numeric: null, reference_low: null, reference_high: null, result_status: null })
    ).toBeNull();
  });
});

describe("LAB_STATUS_BADGE_VARIANT", () => {
  it("only 'critical' gets the strong variant", () => {
    expect(LAB_STATUS_BADGE_VARIANT.critical).toBe("critical");
    expect(LAB_STATUS_BADGE_VARIANT.high).toBe("attention");
    expect(LAB_STATUS_BADGE_VARIANT.low).toBe("attention");
    expect(LAB_STATUS_BADGE_VARIANT.abnormal).toBe("attention");
    expect(LAB_STATUS_BADGE_VARIANT.normal).toBe("normal");
  });
});
