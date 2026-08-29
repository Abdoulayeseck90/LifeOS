import { describe, it, expect } from "vitest";
import { getMonitoringItemDisplayStatus } from "@/services/health/monitoring";

// getMonitoringItemDisplayStatus is pure (no Supabase calls) — see the
// migration 0007 comment for why upcoming/due_soon/due/overdue are
// computed here rather than stored. Reminder scheduling math itself
// (computeScheduledFor/buildReminderKey) has its own test file —
// tests/scheduling.test.ts.
describe("getMonitoringItemDisplayStatus", () => {
  const referenceDate = new Date("2026-06-15T00:00:00.000Z");

  it("returns the stored status as-is for non-active items", () => {
    expect(getMonitoringItemDisplayStatus({ status: "completed", next_due_at: null }, referenceDate)).toBe(
      "completed"
    );
    expect(getMonitoringItemDisplayStatus({ status: "cancelled", next_due_at: "2026-01-01" }, referenceDate)).toBe(
      "cancelled"
    );
    expect(getMonitoringItemDisplayStatus({ status: "deferred", next_due_at: null }, referenceDate)).toBe(
      "deferred"
    );
  });

  it("returns 'upcoming' for an active item with no next_due_at (frequency_note-only schedule)", () => {
    expect(getMonitoringItemDisplayStatus({ status: "active", next_due_at: null }, referenceDate)).toBe("upcoming");
  });

  it("returns 'overdue' when next_due_at is in the past", () => {
    expect(getMonitoringItemDisplayStatus({ status: "active", next_due_at: "2026-06-01" }, referenceDate)).toBe(
      "overdue"
    );
  });

  it("returns 'due' when next_due_at is today", () => {
    expect(getMonitoringItemDisplayStatus({ status: "active", next_due_at: "2026-06-15" }, referenceDate)).toBe(
      "due"
    );
  });

  it("returns 'due_soon' within the 14-day window", () => {
    expect(getMonitoringItemDisplayStatus({ status: "active", next_due_at: "2026-06-20" }, referenceDate)).toBe(
      "due_soon"
    );
    expect(getMonitoringItemDisplayStatus({ status: "active", next_due_at: "2026-06-29" }, referenceDate)).toBe(
      "due_soon"
    );
  });

  it("returns 'upcoming' beyond the 14-day window", () => {
    expect(getMonitoringItemDisplayStatus({ status: "active", next_due_at: "2026-06-30" }, referenceDate)).toBe(
      "upcoming"
    );
    expect(getMonitoringItemDisplayStatus({ status: "active", next_due_at: "2026-12-25" }, referenceDate)).toBe(
      "upcoming"
    );
  });
});
