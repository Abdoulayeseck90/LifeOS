import { describe, it, expect } from "vitest";
import {
  shiftTotalMiles,
  shiftDurationHours,
  sumEarnings,
  sumExpenses,
  computeGigMetrics,
  computePlatformBreakdown,
  computeTaxYearSummary,
  computeScheduleVsActual,
  type GigShiftWithRelations,
} from "@/lib/work/gig-calculations";
import type { GigEarning, GigExpense, GigTaxSettings } from "@/types/work/entities";

function shift(overrides: Partial<GigShiftWithRelations> = {}): GigShiftWithRelations {
  return {
    id: "shift-1",
    user_id: "user-1",
    vehicle_id: null,
    date: "2026-09-05",
    start_time: "2026-09-05T21:00:00.000Z",
    end_time: "2026-09-06T01:27:00.000Z", // 4h27m
    start_odometer: 1000,
    end_odometer: 1088, // 88 miles
    platforms: ["doordash"],
    notes: null,
    status: "completed",
    scheduled_appointment_id: null,
    created_at: "2026-09-05T21:00:00.000Z",
    updated_at: "2026-09-06T01:27:00.000Z",
    earnings: [],
    expenses: [],
    ...overrides,
  };
}

function earning(overrides: Partial<GigEarning> = {}): GigEarning {
  return {
    id: "earning-1",
    user_id: "user-1",
    shift_id: "shift-1",
    platform: "doordash",
    gross: 100,
    tips: 0,
    bonuses: 0,
    other: 0,
    created_at: "2026-09-05T21:00:00.000Z",
    ...overrides,
  };
}

function expense(overrides: Partial<GigExpense> = {}): GigExpense {
  return {
    id: "expense-1",
    user_id: "user-1",
    vehicle_id: null,
    shift_id: "shift-1",
    platform: null,
    category: "fuel",
    amount: 18,
    date: "2026-09-05",
    description: null,
    notes: null,
    created_at: "2026-09-05T21:00:00.000Z",
    updated_at: "2026-09-05T21:00:00.000Z",
    ...overrides,
  };
}

describe("shiftTotalMiles", () => {
  it("computes ending minus starting odometer", () => {
    expect(shiftTotalMiles({ start_odometer: 1000, end_odometer: 1088 })).toBe(88);
  });

  it("returns null while a shift is still in progress (no end odometer)", () => {
    expect(shiftTotalMiles({ start_odometer: 1000, end_odometer: null })).toBeNull();
  });

  it("never goes negative even if data is inconsistent", () => {
    expect(shiftTotalMiles({ start_odometer: 1000, end_odometer: 990 })).toBe(0);
  });
});

describe("shiftDurationHours", () => {
  it("computes hours between start and end", () => {
    const hours = shiftDurationHours({ start_time: "2026-09-05T21:00:00.000Z", end_time: "2026-09-06T01:27:00.000Z" });
    expect(hours).toBeCloseTo(4.45, 2); // 4h27m
  });

  it("returns null while a shift is still in progress", () => {
    expect(shiftDurationHours({ start_time: "2026-09-05T21:00:00.000Z", end_time: null })).toBeNull();
  });
});

describe("sumEarnings / sumExpenses", () => {
  it("sums gross/tips/bonuses/other across multiple platform rows in one shift", () => {
    const totals = sumEarnings([
      earning({ platform: "doordash", gross: 62 }),
      earning({ platform: "ubereats", gross: 38 }),
      earning({ platform: "spark", gross: 71, tips: 5 }),
    ]);
    expect(totals.gross).toBe(171);
    expect(totals.total).toBe(176);
  });

  it("sums expense amounts", () => {
    expect(sumExpenses([expense({ amount: 18 }), expense({ amount: 7 })])).toBe(25);
  });
});

describe("computeGigMetrics", () => {
  it("matches the spec's own worked example (TODAY: $171 gross, 88 miles, 4h27m, $18 expenses)", () => {
    const s = shift({
      earnings: [earning({ platform: "doordash", gross: 62 }), earning({ platform: "ubereats", gross: 38 }), earning({ platform: "spark", gross: 71 })],
      expenses: [expense({ amount: 18 })],
    });
    const metrics = computeGigMetrics([s]);
    expect(metrics.grossEarnings).toBe(171);
    expect(metrics.totalExpenses).toBe(18);
    expect(metrics.estimatedNet).toBe(153);
    expect(metrics.miles).toBe(88);
    expect(metrics.grossPerHour).toBeCloseTo(171 / metrics.hours, 5);
    expect(metrics.grossPerMile).toBeCloseTo(171 / 88, 5);
  });

  it("returns null per-hour/per-mile rates instead of dividing by zero when there's no data yet", () => {
    const metrics = computeGigMetrics([]);
    expect(metrics.grossPerHour).toBeNull();
    expect(metrics.grossPerMile).toBeNull();
    expect(metrics.grossEarnings).toBe(0);
  });

  it("aggregates across multiple shifts", () => {
    const metrics = computeGigMetrics([
      shift({ id: "a", earnings: [earning({ gross: 100 })], expenses: [] }),
      shift({ id: "b", earnings: [earning({ gross: 50 })], expenses: [expense({ amount: 10 })] }),
    ]);
    expect(metrics.grossEarnings).toBe(150);
    expect(metrics.totalExpenses).toBe(10);
    expect(metrics.estimatedNet).toBe(140);
  });
});

describe("computePlatformBreakdown", () => {
  it("breaks down gross earnings by platform across shifts", () => {
    const breakdown = computePlatformBreakdown([
      shift({ id: "a", platforms: ["spark"], earnings: [earning({ platform: "spark", gross: 71 })] }),
      shift({ id: "b", platforms: ["doordash"], earnings: [earning({ platform: "doordash", gross: 62 })] }),
    ]);
    expect(breakdown.spark?.grossEarnings).toBe(71);
    expect(breakdown.doordash?.grossEarnings).toBe(62);
    expect(breakdown.ubereats).toBeUndefined();
  });

  it("attributes a multi-platform shift's earnings only to their own platform, not cross-counted", () => {
    const breakdown = computePlatformBreakdown([
      shift({
        platforms: ["doordash", "spark"],
        earnings: [earning({ platform: "doordash", gross: 62 }), earning({ platform: "spark", gross: 71 })],
      }),
    ]);
    expect(breakdown.doordash?.grossEarnings).toBe(62);
    expect(breakdown.spark?.grossEarnings).toBe(71);
  });
});

describe("computeTaxYearSummary", () => {
  const taxSettings: GigTaxSettings = {
    id: "tax-1",
    user_id: "user-1",
    tax_year: 2026,
    standard_mileage_rate: 0.67,
    notes: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };

  it("computes income by platform, business miles, and an estimated mileage deduction", () => {
    const summary = computeTaxYearSummary(
      [shift({ earnings: [earning({ platform: "doordash", gross: 62 }), earning({ platform: "spark", gross: 71 })] })],
      [expense({ amount: 18 })],
      taxSettings
    );
    expect(summary.incomeByPlatform.doordash).toBe(62);
    expect(summary.incomeByPlatform.spark).toBe(71);
    expect(summary.totalIncome).toBe(133);
    expect(summary.businessMiles).toBe(88);
    expect(summary.recordedExpenses).toBe(18);
    expect(summary.estimatedMileageDeduction).toBeCloseTo(88 * 0.67, 5);
    expect(summary.estimatedNetProfit).toBeCloseTo(133 - 18 - 88 * 0.67, 5);
  });

  it("counts a standalone expense with no shift_id (e.g. insurance) that wouldn't appear in any shift's own expenses list", () => {
    const summary = computeTaxYearSummary([shift({ earnings: [earning({ gross: 100 })] })], [expense({ amount: 45 })], taxSettings);
    expect(summary.recordedExpenses).toBe(45);
  });

  it("returns a null mileage rate/deduction (not zero) when no tax settings exist for the year", () => {
    const summary = computeTaxYearSummary([shift({ earnings: [earning({ gross: 100 })] })], [], null);
    expect(summary.mileageRate).toBeNull();
    expect(summary.estimatedMileageDeduction).toBeNull();
    // Net profit still excludes the (unknown) mileage deduction rather than assuming 0.
    expect(summary.estimatedNetProfit).toBe(100);
  });
});

describe("computeScheduleVsActual", () => {
  it("compares planned hours/goal against actual hours/gross", () => {
    const result = computeScheduleVsActual(
      { date_time: "2026-09-04T21:00:00.000Z", end_time: "2026-09-05T03:00:00.000Z", gig_earnings_goal: 130 },
      shift({ earnings: [earning({ gross: 157 })] })
    );
    expect(result.plannedHours).toBe(6);
    expect(result.goal).toBe(130);
    expect(result.actualGross).toBe(157);
    expect(result.actualHours).toBeCloseTo(4.45, 2);
  });

  it("handles no linked schedule item at all", () => {
    const result = computeScheduleVsActual(null, shift({ earnings: [earning({ gross: 50 })] }));
    expect(result.plannedHours).toBeNull();
    expect(result.goal).toBeNull();
    expect(result.actualGross).toBe(50);
  });
});
