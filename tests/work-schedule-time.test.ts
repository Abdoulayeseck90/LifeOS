import { describe, it, expect } from "vitest";
import { combineWorkScheduleTimes, splitDateTimeLocal } from "@/lib/calendar/work-schedule-time";

describe("combineWorkScheduleTimes", () => {
  it("combines a same-day start/end into instants 6 hours apart", () => {
    const { start, end } = combineWorkScheduleTimes("2026-09-18", "17:00", "23:00");
    const hours = (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000;
    expect(hours).toBe(6);
  });

  it("rolls the end time to the next calendar day for an overnight shift", () => {
    const { start, end } = combineWorkScheduleTimes("2026-09-19", "21:00", "02:00");
    const startDate = new Date(start);
    const endDate = new Date(end);
    expect(endDate.getDate()).toBe(startDate.getDate() + 1);
    const hours = (endDate.getTime() - startDate.getTime()) / 3_600_000;
    expect(hours).toBe(5);
  });

  it("treats identical start/end as a 24-hour overnight rollover (callers should reject this case explicitly before calling)", () => {
    const { start, end } = combineWorkScheduleTimes("2026-09-19", "09:00", "09:00");
    const hours = (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000;
    expect(hours).toBe(24);
  });
});

describe("splitDateTimeLocal", () => {
  it("round-trips through combineWorkScheduleTimes", () => {
    const { start, end } = combineWorkScheduleTimes("2026-09-18", "17:00", "23:00");
    expect(splitDateTimeLocal(start)).toEqual({ date: "2026-09-18", time: "17:00" });
    expect(splitDateTimeLocal(end)).toEqual({ date: "2026-09-18", time: "23:00" });
  });
});
