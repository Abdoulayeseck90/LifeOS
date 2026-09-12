import { describe, it, expect } from "vitest";
import { isRecurringMaster } from "@/lib/calendar/appointment-status";

// Regression for the edit/delete "unreliable" bug: an override row
// (recurrence_parent_id set, recurrence_rule always null) must NOT be
// classified as "part of a series" -- doing so made the client offer a
// this/following scope choice the update_appointment_scoped/
// delete_appointment_scoped RPCs only support on an actual recurring
// master, and picking either on an override always raised a SQL
// exception (0048_calendar_appointments.sql / 0050_gig_driving.sql).
describe("isRecurringMaster", () => {
  it("is true for a recurring master (recurrence_rule set, no parent)", () => {
    expect(isRecurringMaster({ recurrence_rule: "FREQ=WEEKLY;BYDAY=FR" })).toBe(true);
  });

  it("is false for an override row (recurrence_parent_id set, recurrence_rule always null)", () => {
    expect(isRecurringMaster({ recurrence_rule: null })).toBe(false);
  });

  it("is false for a plain standalone appointment (neither set)", () => {
    expect(isRecurringMaster({ recurrence_rule: null })).toBe(false);
  });
});
