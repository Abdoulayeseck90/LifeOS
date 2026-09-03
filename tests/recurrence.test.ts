import { describe, it, expect } from "vitest";
import { generateOccurrences, nextOccurrence, type RecurrenceSourceRow } from "@/lib/calendar/recurrence";
import { buildRecurrenceRule, parseRecurrenceRule, DEFAULT_RECURRENCE_FORM_VALUE } from "@/lib/calendar/recurrence-builder";

interface Row extends RecurrenceSourceRow {
  title: string;
}

function row(overrides: Partial<Row>): Row {
  return {
    id: "master-1",
    date_time: "2026-09-07T14:00:00.000Z", // a Monday
    end_time: null,
    recurrence_rule: null,
    recurrence_excluded_occurrences: [],
    recurrence_parent_id: null,
    recurrence_original_start: null,
    title: "Test",
    ...overrides,
  };
}

const RANGE_START = new Date("2026-09-01T00:00:00.000Z");
const RANGE_END = new Date("2026-10-01T00:00:00.000Z");

describe("generateOccurrences", () => {
  it("returns a single occurrence for a non-recurring appointment inside the range", () => {
    const result = generateOccurrences([row({})], RANGE_START, RANGE_END);
    expect(result).toHaveLength(1);
    expect(result[0]!.occurrenceStart).toBe("2026-09-07T14:00:00.000Z");
    expect(result[0]!.isRecurring).toBe(false);
  });

  it("excludes a non-recurring appointment outside the range", () => {
    const result = generateOccurrences([row({ date_time: "2026-11-01T14:00:00.000Z" })], RANGE_START, RANGE_END);
    expect(result).toHaveLength(0);
  });

  it("expands a daily recurrence", () => {
    const rule = buildRecurrenceRule({ ...DEFAULT_RECURRENCE_FORM_VALUE, frequency: "daily" }, new Date(row({}).date_time));
    const result = generateOccurrences([row({ recurrence_rule: rule })], RANGE_START, RANGE_END);
    // Sep 7 through Sep 30 inclusive of range end exclusivity = 24 days
    expect(result.length).toBe(24);
    expect(result.every((o) => o.isRecurring)).toBe(true);
  });

  it("expands a weekly recurrence on specific weekdays (Mon/Wed/Fri)", () => {
    const rule = buildRecurrenceRule(
      { ...DEFAULT_RECURRENCE_FORM_VALUE, frequency: "weekly", weeklyDays: [1, 3, 5] },
      new Date(row({}).date_time)
    );
    expect(rule).toContain("BYDAY=MO,WE,FR");
    const result = generateOccurrences([row({ recurrence_rule: rule })], RANGE_START, RANGE_END);
    // Sep 2026: Mon/Wed/Fri from the 7th through the 30th
    const days = result.map((o) => new Date(o.occurrenceStart).getUTCDate());
    expect(days).toEqual([7, 9, 11, 14, 16, 18, 21, 23, 25, 28, 30]);
  });

  it("expands a monthly same-date recurrence", () => {
    const rule = buildRecurrenceRule({ ...DEFAULT_RECURRENCE_FORM_VALUE, frequency: "monthly", monthlyPattern: "same_day" }, new Date(row({}).date_time));
    const wideRange = [new Date("2026-09-01T00:00:00.000Z"), new Date("2027-01-01T00:00:00.000Z")] as const;
    const result = generateOccurrences([row({ recurrence_rule: rule })], wideRange[0], wideRange[1]);
    const dates = result.map((o) => o.occurrenceStart.slice(0, 10));
    expect(dates).toEqual(["2026-09-07", "2026-10-07", "2026-11-07", "2026-12-07"]);
  });

  it("expands a monthly first-weekday-of-month recurrence", () => {
    const rule = buildRecurrenceRule(
      { ...DEFAULT_RECURRENCE_FORM_VALUE, frequency: "monthly", monthlyPattern: "first_weekday" },
      new Date(row({}).date_time) // a Monday
    );
    expect(rule).toContain("BYSETPOS=1");
    const result = generateOccurrences(
      [row({ recurrence_rule: rule })],
      new Date("2026-09-01T00:00:00.000Z"),
      new Date("2026-12-01T00:00:00.000Z")
    );
    const dates = result.map((o) => o.occurrenceStart.slice(0, 10));
    // First Monday of Sep/Oct/Nov 2026
    expect(dates).toEqual(["2026-09-07", "2026-10-05", "2026-11-02"]);
  });

  it("expands a monthly last-weekday-of-month recurrence", () => {
    const rule = buildRecurrenceRule(
      { ...DEFAULT_RECURRENCE_FORM_VALUE, frequency: "monthly", monthlyPattern: "last_weekday" },
      new Date(row({}).date_time) // a Monday
    );
    expect(rule).toContain("BYSETPOS=-1");
    const result = generateOccurrences(
      [row({ recurrence_rule: rule })],
      new Date("2026-09-01T00:00:00.000Z"),
      new Date("2026-11-01T00:00:00.000Z")
    );
    const dates = result.map((o) => o.occurrenceStart.slice(0, 10));
    // Last Monday of Sep/Oct 2026
    expect(dates).toEqual(["2026-09-28", "2026-10-26"]);
  });

  it("expands a yearly recurrence", () => {
    const rule = buildRecurrenceRule({ ...DEFAULT_RECURRENCE_FORM_VALUE, frequency: "yearly" }, new Date(row({}).date_time));
    const result = generateOccurrences(
      [row({ recurrence_rule: rule })],
      new Date("2026-09-01T00:00:00.000Z"),
      new Date("2029-01-01T00:00:00.000Z")
    );
    const dates = result.map((o) => o.occurrenceStart.slice(0, 10));
    expect(dates).toEqual(["2026-09-07", "2027-09-07", "2028-09-07"]);
  });

  it("expands a custom every-N-weeks recurrence", () => {
    const rule = buildRecurrenceRule(
      { ...DEFAULT_RECURRENCE_FORM_VALUE, frequency: "custom", customUnit: "weeks", interval: 2 },
      new Date(row({}).date_time)
    );
    expect(rule).toBe("FREQ=WEEKLY;INTERVAL=2");
    const result = generateOccurrences([row({ recurrence_rule: rule })], RANGE_START, RANGE_END);
    const dates = result.map((o) => o.occurrenceStart.slice(0, 10));
    expect(dates).toEqual(["2026-09-07", "2026-09-21"]);
  });

  it("respects an UNTIL end date", () => {
    const rule = buildRecurrenceRule(
      { ...DEFAULT_RECURRENCE_FORM_VALUE, frequency: "daily", endType: "on_date", endDate: "2026-09-10" },
      new Date(row({}).date_time)
    );
    const result = generateOccurrences([row({ recurrence_rule: rule })], RANGE_START, RANGE_END);
    expect(result).toHaveLength(4); // Sep 7, 8, 9, 10
  });

  it("respects a COUNT end condition", () => {
    const rule = buildRecurrenceRule(
      { ...DEFAULT_RECURRENCE_FORM_VALUE, frequency: "daily", endType: "after_count", endCount: 3 },
      new Date(row({}).date_time)
    );
    const result = generateOccurrences([row({ recurrence_rule: rule })], RANGE_START, RANGE_END);
    expect(result).toHaveLength(3);
  });

  it("excludes a cancelled occurrence via recurrence_excluded_occurrences", () => {
    const rule = buildRecurrenceRule({ ...DEFAULT_RECURRENCE_FORM_VALUE, frequency: "weekly", weeklyDays: [1] }, new Date(row({}).date_time));
    const result = generateOccurrences(
      [row({ recurrence_rule: rule, recurrence_excluded_occurrences: ["2026-09-14T14:00:00.000Z"] })],
      RANGE_START,
      RANGE_END
    );
    const dates = result.map((o) => o.occurrenceStart.slice(0, 10));
    expect(dates).not.toContain("2026-09-14");
    expect(dates).toEqual(["2026-09-07", "2026-09-21", "2026-09-28"]);
  });

  it("replaces an excluded occurrence with its override at the override's own (possibly different) time, without duplicating it", () => {
    const rule = buildRecurrenceRule({ ...DEFAULT_RECURRENCE_FORM_VALUE, frequency: "weekly", weeklyDays: [1] }, new Date(row({}).date_time));
    const master = row({ recurrence_rule: rule, recurrence_excluded_occurrences: ["2026-09-14T14:00:00.000Z"] });
    const override = row({
      id: "override-1",
      date_time: "2026-09-15T16:00:00.000Z", // moved from Mon 14th to Tue 15th
      recurrence_parent_id: "master-1",
      recurrence_original_start: "2026-09-14T14:00:00.000Z",
      title: "Moved appointment",
    });
    const result = generateOccurrences([master, override], RANGE_START, RANGE_END);
    const matches = result.filter((o) => o.occurrenceStart.startsWith("2026-09-14") || o.occurrenceStart.startsWith("2026-09-15"));
    expect(matches).toHaveLength(1);
    expect(matches[0]!.occurrenceStart).toBe("2026-09-15T16:00:00.000Z");
    expect(matches[0]!.isOverride).toBe(true);
    expect(matches[0]!.appointment.title).toBe("Moved appointment");
  });

  it("is deterministic: calling it twice with the same input produces identical output", () => {
    const rule = buildRecurrenceRule({ ...DEFAULT_RECURRENCE_FORM_VALUE, frequency: "weekly", weeklyDays: [1, 3] }, new Date(row({}).date_time));
    const rows = [row({ recurrence_rule: rule })];
    const first = generateOccurrences(rows, RANGE_START, RANGE_END);
    const second = generateOccurrences(rows, RANGE_START, RANGE_END);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("preserves a recurring appointment's duration on each generated occurrence", () => {
    const rule = buildRecurrenceRule({ ...DEFAULT_RECURRENCE_FORM_VALUE, frequency: "daily" }, new Date(row({}).date_time));
    const result = generateOccurrences(
      [row({ recurrence_rule: rule, end_time: "2026-09-07T15:30:00.000Z" })],
      RANGE_START,
      new Date("2026-09-09T00:00:00.000Z")
    );
    expect(result[0]!.occurrenceEnd).toBe("2026-09-07T15:30:00.000Z");
    expect(result[1]!.occurrenceEnd).toBe("2026-09-08T15:30:00.000Z");
  });

  it("never throws on a corrupted recurrence rule, just skips it", () => {
    const result = generateOccurrences([row({ recurrence_rule: "NOT A VALID RULE" })], RANGE_START, RANGE_END);
    expect(result).toHaveLength(0);
  });
});

describe("nextOccurrence", () => {
  it("finds the next occurrence of a recurring appointment even when DTSTART is in the past", () => {
    const rule = buildRecurrenceRule({ ...DEFAULT_RECURRENCE_FORM_VALUE, frequency: "weekly", weeklyDays: [1] }, new Date("2020-01-06T14:00:00.000Z"));
    const result = nextOccurrence([row({ date_time: "2020-01-06T14:00:00.000Z", recurrence_rule: rule })], new Date("2026-09-01T00:00:00.000Z"));
    expect(result).not.toBeNull();
    expect(result!.occurrenceStart >= "2026-09-01").toBe(true);
  });

  it("returns null when there is nothing upcoming", () => {
    const result = nextOccurrence([row({ date_time: "2020-01-01T00:00:00.000Z" })], new Date("2026-09-01T00:00:00.000Z"));
    expect(result).toBeNull();
  });
});

describe("parseRecurrenceRule (round-trip with buildRecurrenceRule)", () => {
  const start = new Date("2026-09-07T14:00:00.000Z"); // a Monday

  it("round-trips a weekly Mon/Wed/Fri rule", () => {
    const value = { ...DEFAULT_RECURRENCE_FORM_VALUE, frequency: "weekly" as const, weeklyDays: [1, 3, 5] };
    const rule = buildRecurrenceRule(value, start);
    const parsed = parseRecurrenceRule(rule, start);
    expect(parsed.frequency).toBe("weekly");
    expect(parsed.weeklyDays.slice().sort()).toEqual([1, 3, 5]);
  });

  it("round-trips a monthly first-weekday rule", () => {
    const value = { ...DEFAULT_RECURRENCE_FORM_VALUE, frequency: "monthly" as const, monthlyPattern: "first_weekday" as const };
    const rule = buildRecurrenceRule(value, start);
    const parsed = parseRecurrenceRule(rule, start);
    expect(parsed.frequency).toBe("monthly");
    expect(parsed.monthlyPattern).toBe("first_weekday");
  });

  it("round-trips a custom every-3-months rule with a COUNT end", () => {
    const value = { ...DEFAULT_RECURRENCE_FORM_VALUE, frequency: "custom" as const, customUnit: "months" as const, interval: 3, endType: "after_count" as const, endCount: 5 };
    const rule = buildRecurrenceRule(value, start);
    const parsed = parseRecurrenceRule(rule, start);
    expect(parsed.frequency).toBe("custom");
    expect(parsed.customUnit).toBe("months");
    expect(parsed.interval).toBe(3);
    expect(parsed.endType).toBe("after_count");
    expect(parsed.endCount).toBe(5);
  });

  it("round-trips an UNTIL end date", () => {
    const value = { ...DEFAULT_RECURRENCE_FORM_VALUE, frequency: "daily" as const, endType: "on_date" as const, endDate: "2026-12-31" };
    const rule = buildRecurrenceRule(value, start);
    const parsed = parseRecurrenceRule(rule, start);
    expect(parsed.endType).toBe("on_date");
    expect(parsed.endDate).toBe("2026-12-31");
  });
});
