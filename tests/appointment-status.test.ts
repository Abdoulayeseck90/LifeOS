import { describe, it, expect } from "vitest";
import { isAppointmentPast } from "@/lib/calendar/appointment-status";

const NOW = new Date("2026-09-08T12:00:00.000Z");

describe("isAppointmentPast", () => {
  it("is upcoming when the start (and only) time is in the future", () => {
    expect(isAppointmentPast("2026-09-08T13:00:00.000Z", null, NOW)).toBe(false);
  });

  it("is past when the start (and only) time is in the past", () => {
    expect(isAppointmentPast("2026-09-01T13:00:00.000Z", null, NOW)).toBe(true);
  });

  // Explicit requirement: use end_time when the appointment has one,
  // not the start time -- an appointment that started before `now` but
  // hasn't ended yet is still ongoing/upcoming, not past.
  it("uses end_time over start_time when both are provided: still ongoing", () => {
    expect(isAppointmentPast("2026-09-08T11:00:00.000Z", "2026-09-08T13:00:00.000Z", NOW)).toBe(false);
  });

  it("uses end_time over start_time when both are provided: already ended", () => {
    expect(isAppointmentPast("2026-09-08T09:00:00.000Z", "2026-09-08T11:00:00.000Z", NOW)).toBe(true);
  });

  it("treats an appointment exactly at `now` as not yet past", () => {
    expect(isAppointmentPast(NOW.toISOString(), null, NOW)).toBe(false);
  });

  it("is evaluated per-occurrence, not off some other fixed timestamp — a future recurrence of an old series is upcoming", () => {
    // Simulates a weekly recurring appointment whose *master* date_time
    // is long past, but whose generated occurrenceStart for next week
    // is very much in the future -- the caller must pass the per-
    // occurrence instant, not appointment.date_time, for this to work.
    const oldMasterDate = "2020-01-01T13:00:00.000Z";
    const nextOccurrence = "2026-09-15T13:00:00.000Z";
    expect(isAppointmentPast(oldMasterDate, null, NOW)).toBe(true);
    expect(isAppointmentPast(nextOccurrence, null, NOW)).toBe(false);
  });
});
