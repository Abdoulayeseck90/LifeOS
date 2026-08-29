import { describe, it, expect } from "vitest";
import { buildPushPayload } from "@/lib/push/content";

// Mirrors tests/email.test.ts — push notification content shares the
// exact same "never leak sensitive medical detail" contract as email
// (Push Notifications spec Section 10: "Avoid putting detailed health
// information in the notification title/body").
describe("buildPushPayload", () => {
  const appUrl = "https://example.com";

  it("uses a generic body for a monitoring item reminder, never a specific test/condition name", () => {
    const payload = buildPushPayload("monitoring_item", appUrl);
    expect(payload.body).toBe("You have an upcoming health monitoring item.");
    expect(payload.title).toBe("LifeOS");
  });

  it("uses a generic body for an appointment reminder", () => {
    const payload = buildPushPayload("appointment", appUrl);
    expect(payload.body).toBe("You have an upcoming appointment.");
  });

  it("falls back to a fully generic body for an unrecognized or null entity type", () => {
    expect(buildPushPayload(null, appUrl).body).toBe("You have a new reminder.");
    expect(buildPushPayload("some_future_entity_type", appUrl).body).toBe("You have a new reminder.");
  });

  it("never uses the literal word 'overdue', regardless of entity type", () => {
    for (const entityType of ["monitoring_item", "appointment", null]) {
      const payload = buildPushPayload(entityType, appUrl, true);
      expect(payload.body.toLowerCase()).not.toContain("overdue");
    }
  });

  it("never includes patient-specific medical vocabulary regardless of entity type or overdue-ness", () => {
    const sensitiveTerms = ["hepatitis", "hbv", "viral load", "positive", "abnormal"];

    for (const entityType of ["monitoring_item", "appointment", "medication", null, "diagnostic_test"]) {
      for (const isOverdue of [false, true]) {
        const payload = buildPushPayload(entityType, appUrl, isOverdue);
        const combined = `${payload.title} ${payload.body}`.toLowerCase();
        for (const term of sensitiveTerms) {
          expect(combined).not.toContain(term);
        }
      }
    }
  });

  it("routes appointment reminders to the Appointments page and monitoring reminders to Monitoring", () => {
    expect(buildPushPayload("appointment", appUrl).url).toBe(`${appUrl}/health/appointments`);
    expect(buildPushPayload("monitoring_item", appUrl).url).toBe(`${appUrl}/health/monitoring`);
  });

  it("falls back to the notifications inbox for an unrecognized or null entity type", () => {
    expect(buildPushPayload(null, appUrl).url).toBe(`${appUrl}/notifications`);
    expect(buildPushPayload("some_future_entity_type", appUrl).url).toBe(`${appUrl}/notifications`);
  });
});
