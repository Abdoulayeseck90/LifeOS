import { describe, it, expect } from "vitest";
import { buildReminderEmail } from "@/services/core/email";

// Addendum Section 14: reminder emails must never carry sensitive
// medical content in the subject or body — "You have an upcoming health
// monitoring item," never "Your Hepatitis B viral load test is
// overdue." buildReminderEmail takes no medical content as input at all
// (only an entity type and the app URL), which is the actual guarantee:
// there's nothing sensitive it *could* leak. These tests lock that
// contract in place so a future change can't accidentally add a
// specific title/body param without also breaking a test here.
describe("buildReminderEmail", () => {
  const appUrl = "https://example.com";

  it("uses a generic subject for a monitoring item reminder, never a specific test/condition name", () => {
    const email = buildReminderEmail("monitoring_item", appUrl);
    expect(email.subject).toBe("LifeOS: You have an upcoming health monitoring item");
  });

  it("uses a generic subject for an appointment reminder", () => {
    const email = buildReminderEmail("appointment", appUrl);
    expect(email.subject).toBe("LifeOS: You have an upcoming appointment");
  });

  it("falls back to a fully generic subject for an unrecognized or null entity type", () => {
    expect(buildReminderEmail(null, appUrl).subject).toBe("LifeOS: You have a new reminder");
    expect(buildReminderEmail("some_future_entity_type", appUrl).subject).toBe("LifeOS: You have a new reminder");
  });

  it("uses the same generic 'needs attention' subject for an overdue reminder — never the word 'overdue' itself, regardless of entity type", () => {
    for (const entityType of ["monitoring_item", "appointment", "bill", null]) {
      const email = buildReminderEmail(entityType, appUrl, true);
      expect(email.subject).toBe("LifeOS: You have a reminder that needs attention");
    }
  });

  it("never includes patient-specific medical vocabulary regardless of entity type or overdue-ness", () => {
    const sensitiveTerms = ["hepatitis", "hbv", "viral load", "positive", "abnormal", "overdue"];

    for (const entityType of ["monitoring_item", "appointment", "medication", null, "diagnostic_test"]) {
      for (const isOverdue of [false, true]) {
        const email = buildReminderEmail(entityType, appUrl, isOverdue);
        const combined = `${email.subject} ${email.html} ${email.text}`.toLowerCase();
        for (const term of sensitiveTerms) {
          expect(combined).not.toContain(term);
        }
      }
    }
  });

  it("directs the user back into the authenticated app for details, per Section 14", () => {
    const email = buildReminderEmail("monitoring_item", appUrl);
    expect(email.text).toContain(`${appUrl}/notifications`);
    expect(email.html).toContain(`${appUrl}/notifications`);
  });
});
