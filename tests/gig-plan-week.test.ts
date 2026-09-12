import { describe, it, expect } from "vitest";
import { buildWeekPlanItems, computeWeekPlanTotals, type WeekDayPlan } from "@/lib/work/gig-plan-week";

function day(overrides: Partial<WeekDayPlan> = {}): WeekDayPlan {
  return { included: false, startTime: "", endTime: "", platforms: [], earningsGoal: "", notes: "", ...overrides };
}

describe("buildWeekPlanItems", () => {
  it("skips OFF days entirely and only creates included days", () => {
    const days = [
      day({ included: true, startTime: "17:00", endTime: "21:00", platforms: ["doordash"], earningsGoal: "80" }), // Sun
      day({ included: true, startTime: "17:00", endTime: "21:00", platforms: ["ubereats"], earningsGoal: "75" }), // Mon
      day(), // Tue - OFF
      day({ included: true, startTime: "17:00", endTime: "21:00", platforms: ["doordash", "ubereats"], earningsGoal: "85" }), // Wed
      day({ included: true, startTime: "17:00", endTime: "23:00", platforms: ["spark", "doordash"], earningsGoal: "130" }), // Thu
      day({ included: true, startTime: "10:00", endTime: "15:00", platforms: ["spark"], earningsGoal: "100" }), // Fri
      day(), // Sat - OFF
    ];

    const items = buildWeekPlanItems("2026-09-13", days, "Gig Driving Shift");

    expect(items).toHaveLength(5);
    expect(items.every((item) => item.category === "work")).toBe(true);
    expect(items.every((item) => item.status === "scheduled")).toBe(true);
  });

  it("assigns each included day to weekStartDate + its index, never a recurrence_rule", () => {
    const days = [day({ included: true, startTime: "09:00", endTime: "12:00" })];
    const items = buildWeekPlanItems("2026-09-13", days, "Shift");
    expect(items).toHaveLength(1);
    const [item] = items;
    expect(new Date(item!.date_time).toISOString().slice(0, 10)).toBe("2026-09-13");
    expect("recurrence_rule" in item!).toBe(false);
  });

  it("supports independent platforms/goal/notes per day and a per-day overnight shift", () => {
    const days = [day({ included: true, startTime: "21:00", endTime: "02:00", platforms: ["spark"], earningsGoal: "60", notes: "late shift" })];
    const items = buildWeekPlanItems("2026-09-18", days, "Shift");
    const [item] = items;
    expect(item!.gig_platforms).toEqual(["spark"]);
    expect(item!.gig_earnings_goal).toBe(60);
    expect(item!.notes).toBe("late shift");
    const hours = (new Date(item!.end_time).getTime() - new Date(item!.date_time).getTime()) / 3_600_000;
    expect(hours).toBe(5);
  });

  it("stores null (not empty array/0) for goal/platforms left blank", () => {
    const days = [day({ included: true, startTime: "09:00", endTime: "12:00" })];
    const items = buildWeekPlanItems("2026-09-13", days, "Shift");
    const [item] = items;
    expect(item!.gig_platforms).toBeNull();
    expect(item!.gig_earnings_goal).toBeNull();
  });
});

describe("computeWeekPlanTotals", () => {
  it("sums hours/goal only across included days with valid times", () => {
    const days = [
      day({ included: true, startTime: "17:00", endTime: "21:00", earningsGoal: "80" }), // 4h
      day({ included: true, startTime: "10:00", endTime: "15:00", earningsGoal: "100" }), // 5h
      day(), // OFF, excluded
    ];
    const totals = computeWeekPlanTotals(days);
    expect(totals.totalHours).toBe(9);
    expect(totals.totalGoal).toBe(180);
    expect(totals.shiftCount).toBe(2);
  });

  it("is all zero when nothing is included", () => {
    const totals = computeWeekPlanTotals([day(), day(), day()]);
    expect(totals).toEqual({ totalHours: 0, totalGoal: 0, shiftCount: 0 });
  });
});
