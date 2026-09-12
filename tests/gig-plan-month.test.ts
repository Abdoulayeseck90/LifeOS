import { describe, it, expect } from "vitest";
import { buildMonthPlanOccurrences, computeMonthPlanTotals, type WeekdayPlan } from "@/lib/work/gig-plan-month";

function unselected(): WeekdayPlan {
  return { selected: false, startTime: "", endTime: "", platforms: [], earningsGoal: "", notes: "" };
}

function plans(overrides: Partial<Record<number, Partial<WeekdayPlan>>>): WeekdayPlan[] {
  const base = Array.from({ length: 7 }, unselected);
  for (const [index, patch] of Object.entries(overrides)) {
    base[Number(index)] = { ...base[Number(index)]!, ...patch };
  }
  return base;
}

describe("buildMonthPlanOccurrences", () => {
  it("generates one occurrence per matching weekday in the month, none for unselected weekdays", () => {
    // September 2026: Mondays are the 7th, 14th, 21st, 28th.
    const weekdayPlans = plans({ 1: { selected: true, startTime: "17:00", endTime: "21:00", platforms: ["doordash"] } });
    const occurrences = buildMonthPlanOccurrences("2026-09", weekdayPlans, "Gig Driving Shift");

    expect(occurrences).toHaveLength(4);
    expect(occurrences.map((o) => o.date)).toEqual(["2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28"]);
    expect(occurrences.every((o) => o.category === "work")).toBe(true);
    expect(occurrences.every((o) => !("recurrence_rule" in o))).toBe(true);
  });

  it("combines multiple selected weekdays with their own independent settings", () => {
    // September 2026: Fridays are 4, 11, 18, 25; Saturdays are 5, 12, 19, 26.
    const weekdayPlans = plans({
      5: { selected: true, startTime: "17:00", endTime: "23:00", platforms: ["spark", "doordash"], earningsGoal: "130" },
      6: { selected: true, startTime: "10:00", endTime: "15:00", platforms: ["spark"], earningsGoal: "100" },
    });
    const occurrences = buildMonthPlanOccurrences("2026-09", weekdayPlans, "Shift");

    expect(occurrences).toHaveLength(8);
    const friday = occurrences.find((o) => o.date === "2026-09-04")!;
    expect(friday.gig_platforms).toEqual(["spark", "doordash"]);
    expect(friday.gig_earnings_goal).toBe(130);
    const saturday = occurrences.find((o) => o.date === "2026-09-05")!;
    expect(saturday.gig_platforms).toEqual(["spark"]);
    expect(saturday.gig_earnings_goal).toBe(100);
  });

  it("supports an overnight shift for a selected weekday", () => {
    const weekdayPlans = plans({ 5: { selected: true, startTime: "21:00", endTime: "02:00" } });
    const occurrences = buildMonthPlanOccurrences("2026-09", weekdayPlans, "Shift");
    expect(occurrences.length).toBeGreaterThan(0);
    for (const occurrence of occurrences) {
      const hours = (new Date(occurrence.end_time).getTime() - new Date(occurrence.date_time).getTime()) / 3_600_000;
      expect(hours).toBe(5);
    }
  });

  it("produces nothing when no weekday is selected", () => {
    expect(buildMonthPlanOccurrences("2026-09", plans({}), "Shift")).toHaveLength(0);
  });
});

describe("computeMonthPlanTotals", () => {
  it("sums hours and goal across every generated occurrence", () => {
    const weekdayPlans = plans({ 1: { selected: true, startTime: "17:00", endTime: "21:00", earningsGoal: "80" } });
    const occurrences = buildMonthPlanOccurrences("2026-09", weekdayPlans, "Shift");
    const totals = computeMonthPlanTotals(occurrences);
    expect(totals.shiftCount).toBe(4);
    expect(totals.totalHours).toBe(16);
    expect(totals.totalGoal).toBe(320);
  });
});
