import { describe, it, expect } from "vitest";
import { computeScheduledFor, buildReminderKey } from "@/lib/notifications/scheduling";

// Notification Timing & Email Rules addendum: "7 days before" must land
// on the right *local calendar day*, not "168 hours earlier in UTC" —
// those differ whenever a DST transition falls in between. These cases
// were verified empirically against date-fns-tz before being locked in
// here (see the America/Toronto Nov 1 2026 DST-end examples below).
describe("computeScheduledFor", () => {
  it("computes a date-only event's lead time as a fixed local time on the target day (UTC)", () => {
    const result = computeScheduledFor("2026-09-30", true, "seven_day", "UTC");
    expect(result).toBe(new Date("2026-09-23T08:00:00Z").toISOString());
  });

  it("day_of resolves to the due date itself, not a day earlier or later", () => {
    const result = computeScheduledFor("2026-09-30", true, "day_of", "UTC");
    expect(result).toBe(new Date("2026-09-30T08:00:00Z").toISOString());
  });

  it("stays correct across a DST transition for a date-only event (America/Toronto, DST ends Nov 1 2026)", () => {
    // 7 days before Nov 5 (EST, UTC-5) is Oct 29 (still EDT, UTC-4).
    const result = computeScheduledFor("2026-11-05", true, "seven_day", "America/Toronto");
    expect(result).toBe(new Date("2026-10-29T08:00:00-04:00").toISOString());
  });

  it("resolves a full timestamp to the correct *local* calendar day even when the UTC day differs", () => {
    // 2026-11-05T02:00:00Z is still Nov 4, 9pm in Toronto (EST, UTC-5).
    const dueAtUtc = "2026-11-05T02:00:00.000Z";
    const dayOf = computeScheduledFor(dueAtUtc, false, "day_of", "America/Toronto");
    expect(dayOf).toBe(new Date("2026-11-04T08:00:00-05:00").toISOString());
  });

  it("stays correct across a DST transition for a real timestamp event", () => {
    const dueAtUtc = "2026-11-05T02:00:00.000Z"; // Nov 4, 9pm Toronto (EST)
    const sevenDayBefore = computeScheduledFor(dueAtUtc, false, "seven_day", "America/Toronto");
    // 7 days before Nov 4 is Oct 28, still EDT (UTC-4) before DST ends.
    expect(sevenDayBefore).toBe(new Date("2026-10-28T08:00:00-04:00").toISOString());
  });
});

describe("buildReminderKey", () => {
  it("builds a stable key from entity type, id, bucket, and channel", () => {
    expect(buildReminderKey("appointment", "abc-123", "seven_day", "email")).toBe("appointment:abc-123:seven_day:email");
  });

  it("folds an overdue cycle number into the bucket portion so recurring overdue reminders get distinct keys", () => {
    expect(buildReminderKey("monitoring_item", "xyz", "overdue", "in_app", 0)).toBe("monitoring_item:xyz:overdue-0:in_app");
    expect(buildReminderKey("monitoring_item", "xyz", "overdue", "in_app", 2)).toBe("monitoring_item:xyz:overdue-2:in_app");
  });
});
