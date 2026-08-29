import { describe, it, expect } from "vitest";
import { weightToKg, heightToMeters, computeBmi } from "@/lib/health/bmi";

describe("weightToKg", () => {
  it("returns kg unchanged", () => {
    expect(weightToKg(55.05, "kg")).toBe(55.05);
  });

  it("converts lb to kg", () => {
    expect(weightToKg(121.4, "lb")).toBeCloseTo(55.066, 2);
  });
});

describe("heightToMeters", () => {
  it("converts cm to meters", () => {
    expect(heightToMeters(176, "cm")).toBeCloseTo(1.76, 5);
  });

  it("converts inches to meters", () => {
    expect(heightToMeters(69.29, "in")).toBeCloseTo(1.76, 2);
  });
});

describe("computeBmi", () => {
  it("computes BMI from kg/cm", () => {
    expect(computeBmi(55.05, "kg", 176, "cm")).toBeCloseTo(17.77, 2);
  });

  it("computes the same BMI regardless of input units", () => {
    const metric = computeBmi(55.05, "kg", 176, "cm");
    const imperial = computeBmi(121.4, "lb", 69.29, "in");
    expect(imperial).toBeCloseTo(metric, 1);
  });

  it("rounds to 2 decimal places", () => {
    expect(computeBmi(70, "kg", 175, "cm")).toBe(22.86);
  });
});
