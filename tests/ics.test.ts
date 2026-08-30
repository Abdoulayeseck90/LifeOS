import { describe, it, expect } from "vitest";
import { buildIcsFeed, type CalendarFeedEvent } from "@/lib/calendar/ics";

function appointment(overrides: Partial<CalendarFeedEvent> = {}): CalendarFeedEvent {
  return {
    source: "appointment",
    id: "11111111-1111-1111-1111-111111111111",
    title: "Dr. Smith",
    description: null,
    startsAt: "2026-06-15T14:00:00.000Z",
    dueDate: null,
    location: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildIcsFeed", () => {
  it("produces a valid VCALENDAR wrapper", () => {
    const ics = buildIcsFeed([]);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("PRODID:");
    expect(ics).toContain("CALSCALE:GREGORIAN");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("emits a timed VEVENT with a UTC DTSTART for a full-instant event", () => {
    const ics = buildIcsFeed([appointment()]);
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("DTSTART:20260615T140000Z");
    expect(ics).toContain("END:VEVENT");
  });

  it("emits an all-day VEVENT for a date-only event", () => {
    const ics = buildIcsFeed([
      appointment({ source: "monitoring", startsAt: null, dueDate: "2026-07-01", title: "Blood test" }),
    ]);
    expect(ics).toContain("DTSTART;VALUE=DATE:20260701");
    expect(ics).not.toContain("DTSTART:20260701T");
  });

  it("generates a stable UID keyed by source and id, unaffected by content changes", () => {
    const base = appointment();
    const icsBefore = buildIcsFeed([base]);
    const icsAfter = buildIcsFeed([{ ...base, title: "Dr. Smith (rescheduled)", updatedAt: "2026-06-10T00:00:00.000Z" }]);

    const uidPattern = /UID:lifeos-appointment-11111111-1111-1111-1111-111111111111@lifeos\.local/;
    expect(icsBefore).toMatch(uidPattern);
    expect(icsAfter).toMatch(uidPattern);
  });

  it("reflects an updated LAST-MODIFIED when the event changes", () => {
    const ics = buildIcsFeed([appointment({ updatedAt: "2026-06-12T09:30:00.000Z" })]);
    expect(ics).toContain("LAST-MODIFIED:20260612T093000Z");
  });

  it("escapes commas, semicolons, and backslashes in text fields", () => {
    const ics = buildIcsFeed([appointment({ title: "Smith, John; Cardiology\\Notes" })]);
    expect(ics).toContain("SUMMARY:Smith\\, John\\; Cardiology\\\\Notes");
  });

  it("omits DESCRIPTION and LOCATION when not provided", () => {
    const ics = buildIcsFeed([appointment({ description: null, location: null })]);
    expect(ics).not.toContain("DESCRIPTION:");
    expect(ics).not.toContain("LOCATION:");
  });

  it("includes LOCATION and DESCRIPTION when present", () => {
    const ics = buildIcsFeed([appointment({ description: "Bring insurance card", location: "123 Main St" })]);
    expect(ics).toContain("LOCATION:123 Main St");
    expect(ics).toContain("DESCRIPTION:Bring insurance card");
  });

  it("folds lines longer than 75 octets per RFC 5545", () => {
    const longTitle = "A".repeat(120);
    const ics = buildIcsFeed([appointment({ title: longTitle })]);
    const lines = ics.split("\r\n");
    // No raw line (pre-fold-continuation) should exceed 75 chars.
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(75);
    }
    // The folded continuation starts with a single space.
    expect(ics).toMatch(/\r\n [A-Z]/);
  });

  it("renders multiple events independently", () => {
    const ics = buildIcsFeed([
      appointment({ id: "aaaa1111-0000-0000-0000-000000000000" }),
      appointment({ id: "bbbb2222-0000-0000-0000-000000000000", source: "monitoring", startsAt: null, dueDate: "2026-08-01", title: "Cholesterol panel" }),
    ]);
    expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(2);
    expect(ics).toContain("lifeos-appointment-aaaa1111-0000-0000-0000-000000000000@lifeos.local");
    expect(ics).toContain("lifeos-monitoring-bbbb2222-0000-0000-0000-000000000000@lifeos.local");
  });
});
