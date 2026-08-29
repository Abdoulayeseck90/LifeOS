import { describe, it, expect } from "vitest";
import {
  mlToUnit,
  unitToMl,
  formatHydrationAmount,
  computeHydrationTotalMlForDate,
  groupHydrationByBeverageForDate,
  hasFluidRestrictionCondition,
  DEFAULT_HYDRATION_TARGET_ML,
} from "@/lib/health/hydration";
import type { HydrationLogEntry } from "@/types/health/entities";

function entry(overrides: Partial<HydrationLogEntry> = {}): HydrationLogEntry {
  return {
    id: "id-" + Math.random(),
    user_id: "user-1",
    date: "2026-08-27",
    beverage_type: "water",
    amount_ml: 250,
    created_at: "2026-08-27T08:00:00Z",
    ...overrides,
  };
}

describe("unit conversion", () => {
  it("converts mL to L", () => {
    expect(mlToUnit(2500, "L")).toBe(2.5);
  });

  it("converts mL to fl oz matching the spec's worked examples", () => {
    expect(Math.round(mlToUnit(1000, "fl_oz"))).toBe(34);
    expect(Math.round(mlToUnit(2000, "fl_oz"))).toBe(68);
    expect(Math.round(mlToUnit(2500, "fl_oz"))).toBe(85);
    expect(Math.round(mlToUnit(3000, "fl_oz"))).toBe(101);
  });

  it("round-trips unitToMl(mlToUnit(x))", () => {
    const ml = 1750;
    expect(Math.round(unitToMl(mlToUnit(ml, "fl_oz"), "fl_oz"))).toBe(ml);
  });
});

describe("formatHydrationAmount", () => {
  it("formats liters to one decimal place", () => {
    expect(formatHydrationAmount(1800, "L")).toBe("1.8 L");
  });

  it("formats mL as a whole number", () => {
    expect(formatHydrationAmount(1837.4, "mL")).toBe("1837 mL");
  });

  it("formats fl oz as a whole number", () => {
    expect(formatHydrationAmount(2500, "fl_oz")).toBe("85 fl oz");
  });
});

describe("computeHydrationTotalMlForDate", () => {
  it("sums only entries matching the given date", () => {
    const entries = [
      entry({ date: "2026-08-27", amount_ml: 250 }),
      entry({ date: "2026-08-27", amount_ml: 500 }),
      entry({ date: "2026-08-26", amount_ml: 1000 }),
    ];
    expect(computeHydrationTotalMlForDate(entries, "2026-08-27")).toBe(750);
  });

  it("returns 0 when there are no entries for that date", () => {
    expect(computeHydrationTotalMlForDate([], "2026-08-27")).toBe(0);
  });
});

describe("groupHydrationByBeverageForDate", () => {
  it("sums amounts per beverage type for the given date only", () => {
    const entries = [
      entry({ date: "2026-08-27", beverage_type: "water", amount_ml: 500 }),
      entry({ date: "2026-08-27", beverage_type: "water", amount_ml: 250 }),
      entry({ date: "2026-08-27", beverage_type: "coffee", amount_ml: 200 }),
      entry({ date: "2026-08-26", beverage_type: "water", amount_ml: 1000 }),
    ];

    const grouped = groupHydrationByBeverageForDate(entries, "2026-08-27");

    expect(grouped).toEqual(
      expect.arrayContaining([
        { beverage_type: "water", amount_ml: 750 },
        { beverage_type: "coffee", amount_ml: 200 },
      ])
    );
    expect(grouped).toHaveLength(2);
  });
});

describe("hasFluidRestrictionCondition", () => {
  it("matches kidney/renal/heart-related condition names case-insensitively", () => {
    expect(hasFluidRestrictionCondition(["Chronic Kidney Disease"])).toBe(true);
    expect(hasFluidRestrictionCondition(["congestive heart failure"])).toBe(true);
    expect(hasFluidRestrictionCondition(["Hepatitis B"])).toBe(false);
  });

  it("returns false for an empty condition list", () => {
    expect(hasFluidRestrictionCondition([])).toBe(false);
  });
});

describe("DEFAULT_HYDRATION_TARGET_ML", () => {
  it("is within the general 2.0-2.5 L adult estimate range", () => {
    expect(DEFAULT_HYDRATION_TARGET_ML).toBeGreaterThanOrEqual(2000);
    expect(DEFAULT_HYDRATION_TARGET_ML).toBeLessThanOrEqual(2500);
  });
});
