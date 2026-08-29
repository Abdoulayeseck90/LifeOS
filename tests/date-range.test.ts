import { describe, it, expect } from "vitest";
import { computeQuickRange, matchQuickRange, dateRangeToUtcBounds } from "@/lib/dates/range";

const REFERENCE_DATE = new Date("2026-08-26T12:00:00.000Z");

describe("computeQuickRange", () => {
  it("'today' is a single-day range", () => {
    expect(computeQuickRange("today", REFERENCE_DATE)).toEqual({ from: "2026-08-26", to: "2026-08-26" });
  });

  it("'7d' spans the last 7 days inclusive of today", () => {
    expect(computeQuickRange("7d", REFERENCE_DATE)).toEqual({ from: "2026-08-20", to: "2026-08-26" });
  });

  it("'30d' spans the last 30 days inclusive of today", () => {
    expect(computeQuickRange("30d", REFERENCE_DATE)).toEqual({ from: "2026-07-28", to: "2026-08-26" });
  });

  it("'thisYear' spans January 1st of the current year through today", () => {
    expect(computeQuickRange("thisYear", REFERENCE_DATE)).toEqual({ from: "2026-01-01", to: "2026-08-26" });
  });

  it("'3m' and '6m' subtract calendar months, not a fixed day count", () => {
    expect(computeQuickRange("3m", REFERENCE_DATE)).toEqual({ from: "2026-05-26", to: "2026-08-26" });
    expect(computeQuickRange("6m", REFERENCE_DATE)).toEqual({ from: "2026-02-26", to: "2026-08-26" });
  });
});

describe("matchQuickRange", () => {
  it("returns null when no range is active", () => {
    expect(matchQuickRange({ from: null, to: null }, REFERENCE_DATE)).toBeNull();
  });

  it("identifies a range that exactly matches a quick preset", () => {
    const sevenDay = computeQuickRange("7d", REFERENCE_DATE);
    expect(matchQuickRange(sevenDay, REFERENCE_DATE)).toBe("7d");
  });

  it("returns 'custom' for an active range that matches no preset", () => {
    expect(matchQuickRange({ from: "2026-03-01", to: "2026-03-15" }, REFERENCE_DATE)).toBe("custom");
  });
});

describe("dateRangeToUtcBounds", () => {
  it("returns null bounds for an empty range", () => {
    expect(dateRangeToUtcBounds({ from: null, to: null }, "America/Toronto")).toEqual({
      fromUtc: null,
      toUtcExclusive: null,
    });
  });

  it("converts the local start-of-day into the correct UTC instant for a negative-offset zone", () => {
    // America/Toronto is UTC-4 in August (EDT) — local midnight on the
    // 26th is 04:00 UTC the same day.
    const bounds = dateRangeToUtcBounds({ from: "2026-08-26", to: null }, "America/Toronto");
    expect(bounds.fromUtc).toBe("2026-08-26T04:00:00.000Z");
  });

  it("uses an exclusive start-of-next-day upper bound, not end-of-day 23:59:59", () => {
    const bounds = dateRangeToUtcBounds({ from: null, to: "2026-08-26" }, "America/Toronto");
    // Start of the 27th in Toronto (EDT, UTC-4) is 2026-08-27T04:00:00Z.
    expect(bounds.toUtcExclusive).toBe("2026-08-27T04:00:00.000Z");
  });

  it("handles a positive-offset zone correctly", () => {
    // Asia/Tokyo is UTC+9 — local midnight on the 26th is the PREVIOUS
    // day at 15:00 UTC.
    const bounds = dateRangeToUtcBounds({ from: "2026-08-26", to: "2026-08-26" }, "Asia/Tokyo");
    expect(bounds.fromUtc).toBe("2026-08-25T15:00:00.000Z");
    expect(bounds.toUtcExclusive).toBe("2026-08-26T15:00:00.000Z");
  });
});
