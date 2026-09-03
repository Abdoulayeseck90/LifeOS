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
    recurrenceRule: null,
    recurrenceExcludedOccurrences: [],
    recurrenceParentId: null,
    recurrenceOriginalStart: null,
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

  it("emits RRULE and EXDATE for a recurring master instead of expanding occurrences", () => {
    const ics = buildIcsFeed([
      appointment({
        recurrenceRule: "FREQ=WEEKLY;BYDAY=MO",
        recurrenceExcludedOccurrences: ["2026-06-22T14:00:00.000Z"],
      }),
    ]);
    expect(ics).toContain("RRULE:FREQ=WEEKLY;BYDAY=MO");
    expect(ics).toContain("EXDATE:20260622T140000Z");
    // Only one VEVENT — the series is expressed via RRULE, not one
    // VEVENT per future occurrence.
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });

  it("emits RECURRENCE-ID and shares the master's UID for an override row", () => {
    const master = appointment({ id: "11111111-1111-1111-1111-111111111111", recurrenceRule: "FREQ=WEEKLY;BYDAY=MO" });
    const override = appointment({
      id: "22222222-2222-2222-2222-222222222222",
      startsAt: "2026-06-23T16:00:00.000Z",
      recurrenceParentId: "11111111-1111-1111-1111-111111111111",
      recurrenceOriginalStart: "2026-06-22T14:00:00.000Z",
    });
    const ics = buildIcsFeed([master, override]);

    expect(ics).toContain("RECURRENCE-ID:20260622T140000Z");
    // Both VEVENTs (master + override) carry the SAME UID, keyed by the
    // master's id — this is what tells a calendar client the override
    // replaces one instance of that series rather than being unrelated.
    const uidMatches = ics.match(/UID:lifeos-appointment-11111111-1111-1111-1111-111111111111@lifeos\.local/g);
    expect(uidMatches).toHaveLength(2);
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

  // Regression test for a real bug: Postgres/PostgREST serializes
  // timestamptz as e.g. "2026-08-29T22:01:57.468358+00:00" (six-digit
  // microseconds, "+00:00" instead of "Z") — not the clean ".000Z" shape
  // every other fixture in this file uses. The old implementation left
  // "+0000" straight in the DTSTART/CREATED/LAST-MODIFIED output, which
  // is invalid RFC 5545 and made Apple Calendar silently drop every
  // event. This exact input string is what actually broke it in
  // production.
  it("correctly formats a real Supabase-style timestamp (microseconds + +00:00 offset)", () => {
    const ics = buildIcsFeed([
      appointment({
        startsAt: "2026-09-02T04:00:00+00:00",
        createdAt: "2026-08-29T22:01:57.468358+00:00",
        updatedAt: "2026-08-29T22:01:57.468358+00:00",
      }),
    ]);
    expect(ics).toContain("DTSTART:20260902T040000Z");
    expect(ics).toContain("CREATED:20260829T220157Z");
    expect(ics).toContain("LAST-MODIFIED:20260829T220157Z");
    expect(ics).not.toContain("+0000");
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
