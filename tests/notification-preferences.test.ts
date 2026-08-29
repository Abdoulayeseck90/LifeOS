import { describe, it, expect } from "vitest";
import { mergeNotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES, NOTIFICATION_CATEGORIES } from "@/lib/notifications/preferences";

// Regression coverage for "TypeError: Cannot read properties of
// undefined (reading 'appointments')" — every scenario the bug report
// named (A-F), exercised directly against the pure merge function that
// now sits at the actual data-loading boundary (services/core/profile.ts)
// instead of being handled with defensive optional chaining at the
// render site. Extended for the `push` channel (Push Notifications spec)
// without changing what each scenario is actually testing.
describe("mergeNotificationPreferences", () => {
  it("(A) returns complete defaults for a brand new user — null/undefined input", () => {
    expect(mergeNotificationPreferences(null)).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    expect(mergeNotificationPreferences(undefined)).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
  });

  it("(B) preserves every value for a complete, already-correct record unchanged", () => {
    const complete = {
      appointments: { push: false, in_app: false, email: true },
      monitoring: { push: true, in_app: true, email: false },
      general_activity: { push: false, in_app: false, email: false },
      bills: { push: true, in_app: true, email: false },
      subscriptions: { push: true, in_app: true, email: false },
      documents: { push: true, in_app: true, email: false },
      dua: { push: true, in_app: true, email: false },
      email_timing: { seven_day: false, three_day: true, one_day: false, day_of: true },
      overdue_email_enabled: false,
      overdue_email_recurring: true,
    };
    expect(mergeNotificationPreferences(complete)).toEqual(complete);
  });

  it("(C) fills in a missing 'appointments' category with defaults while preserving the rest", () => {
    const partial = {
      monitoring: { push: true, in_app: false, email: false },
      general_activity: { push: true, in_app: true, email: true },
      email_timing: { seven_day: true, three_day: true, one_day: true, day_of: false },
      overdue_email_enabled: true,
      overdue_email_recurring: false,
    };
    const result = mergeNotificationPreferences(partial);
    expect(result.appointments).toEqual(DEFAULT_NOTIFICATION_PREFERENCES.appointments);
    expect(result.monitoring).toEqual({ push: true, in_app: false, email: false });
    expect(result.general_activity).toEqual({ push: true, in_app: true, email: true });
  });

  it("(D) fills in a missing 'monitoring' category with defaults while preserving the rest", () => {
    const partial = { appointments: { push: false, in_app: false, email: false } };
    const result = mergeNotificationPreferences(partial);
    expect(result.monitoring).toEqual(DEFAULT_NOTIFICATION_PREFERENCES.monitoring);
    expect(result.appointments).toEqual({ push: false, in_app: false, email: false });
  });

  it("(E) fills in a missing 'general_activity' category with defaults while preserving the rest", () => {
    const partial = {
      appointments: { push: true, in_app: true, email: true },
      monitoring: { push: true, in_app: true, email: true },
    };
    const result = mergeNotificationPreferences(partial);
    expect(result.general_activity).toEqual(DEFAULT_NOTIFICATION_PREFERENCES.general_activity);
  });

  it("(F) fills every field from an entirely old/unrecognized preference structure", () => {
    // Simulates the pre-addendum shape: just the old single boolean,
    // nothing this app's current code ever wrote.
    const old = { email_reminders_enabled: true };
    const result = mergeNotificationPreferences(old);
    expect(result).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
  });

  it("fills a category that exists but is missing one of its three keys (partial category, not just partial top level)", () => {
    const partial = { appointments: { push: false, in_app: false } };
    const result = mergeNotificationPreferences(partial);
    expect(result.appointments).toEqual({
      push: false,
      in_app: false,
      email: DEFAULT_NOTIFICATION_PREFERENCES.appointments.email,
    });
  });

  it("fills a missing 'push' key on an otherwise-complete pre-push-feature category", () => {
    // Simulates a real existing row from before the push channel existed —
    // in_app/email present, push simply never written.
    const partial = { appointments: { in_app: false, email: true } };
    const result = mergeNotificationPreferences(partial);
    expect(result.appointments).toEqual({
      push: DEFAULT_NOTIFICATION_PREFERENCES.appointments.push,
      in_app: false,
      email: true,
    });
  });

  it("ignores non-boolean garbage in a leaf field rather than propagating it", () => {
    const garbage = { appointments: { push: "no", in_app: "yes", email: 1 } };
    const result = mergeNotificationPreferences(garbage);
    expect(result.appointments).toEqual(DEFAULT_NOTIFICATION_PREFERENCES.appointments);
  });

  it("NOTIFICATION_CATEGORIES is exactly the 7 confirmed categories — no separate labs/imaging/medication split", () => {
    expect(NOTIFICATION_CATEGORIES).toEqual([
      "appointments",
      "monitoring",
      "general_activity",
      "bills",
      "subscriptions",
      "documents",
      "dua",
    ]);
  });

  it("new-user defaults are push+in_app ON, email OFF for every category (Push Notifications spec)", () => {
    for (const category of NOTIFICATION_CATEGORIES) {
      expect(DEFAULT_NOTIFICATION_PREFERENCES[category]).toEqual({ push: true, in_app: true, email: false });
    }
  });
});
