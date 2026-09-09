import { describe, it, expect } from "vitest";
import { mergeAppointmentFields } from "@/lib/calendar/appointment-merge";
import type { Appointment } from "@/types/health/entities";

function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: "appt-1",
    user_id: "user-1",
    title: "Dentist",
    description: "Bring insurance card",
    provider_name: null,
    specialty: null,
    appointment_type: null,
    date_time: "2026-09-05T21:00:00.000Z",
    end_time: null,
    location: "123 Main St",
    category: "personal",
    status: "scheduled",
    preparation_notes: null,
    clinician_instructions: null,
    follow_up_date: null,
    related_condition_id: null,
    notes: null,
    gig_platforms: null,
    gig_earnings_goal: null,
    reminder_lead_minutes: null,
    recurrence_rule: null,
    recurrence_excluded_occurrences: [],
    recurrence_parent_id: null,
    recurrence_original_start: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("mergeAppointmentFields", () => {
  it("applies a changed field and keeps every untouched field from the current row", () => {
    const current = appointment();
    const merged = mergeAppointmentFields(current, { title: "Dentist (rescheduled)" });
    expect(merged.title).toBe("Dentist (rescheduled)");
    expect(merged.description).toBe(current.description);
    expect(merged.location).toBe(current.location);
    expect(merged.date_time).toBe(current.date_time);
  });

  // Regression: appointment-form.tsx's buildPayload() always sends an
  // explicit `description: null` when the field is blank (not an
  // omitted key) -- the route previously merged this with `??`, which
  // treats null the same as "not provided" and silently kept the old
  // description instead of clearing it.
  it("clears the description when the client explicitly sends null", () => {
    const current = appointment({ description: "Bring insurance card" });
    const merged = mergeAppointmentFields(current, { description: null });
    expect(merged.description).toBeNull();
  });

  it("keeps the current description when the field is omitted entirely", () => {
    const current = appointment({ description: "Bring insurance card" });
    const merged = mergeAppointmentFields(current, { title: "Dentist (rescheduled)" });
    expect(merged.description).toBe("Bring insurance card");
  });

  it("clears end_time, related_condition_id, reminder_lead_minutes, and recurrence_rule on an explicit null", () => {
    const current = appointment({
      end_time: "2026-09-05T22:00:00.000Z",
      related_condition_id: "11111111-1111-1111-1111-111111111111",
      reminder_lead_minutes: 30,
      recurrence_rule: "FREQ=WEEKLY",
    });
    const merged = mergeAppointmentFields(current, {
      end_time: null,
      related_condition_id: null,
      reminder_lead_minutes: null,
      recurrence_rule: null,
    });
    expect(merged.end_time).toBeNull();
    expect(merged.related_condition_id).toBeNull();
    expect(merged.reminder_lead_minutes).toBeNull();
    expect(merged.recurrence_rule).toBeNull();
  });

  it("clears gig_platforms and gig_earnings_goal on an explicit null (e.g. switching away from category=work)", () => {
    const current = appointment({ category: "work", gig_platforms: ["doordash"], gig_earnings_goal: 150 });
    const merged = mergeAppointmentFields(current, { category: "personal", gig_platforms: null, gig_earnings_goal: null });
    expect(merged.category).toBe("personal");
    expect(merged.gig_platforms).toBeNull();
    expect(merged.gig_earnings_goal).toBeNull();
  });

  it("updates date_time and category together", () => {
    const current = appointment();
    const merged = mergeAppointmentFields(current, { date_time: "2026-10-01T15:00:00.000Z", category: "medical" });
    expect(merged.date_time).toBe("2026-10-01T15:00:00.000Z");
    expect(merged.category).toBe("medical");
  });

  it("no-op merge (nothing changed) reproduces the current row exactly", () => {
    const current = appointment({ notes: "some notes" });
    const merged = mergeAppointmentFields(current, {});
    expect(merged).toEqual({
      title: current.title,
      description: current.description,
      provider_name: current.provider_name,
      specialty: current.specialty,
      appointment_type: current.appointment_type,
      date_time: current.date_time,
      end_time: current.end_time,
      location: current.location,
      category: current.category,
      status: current.status,
      related_condition_id: current.related_condition_id,
      preparation_notes: current.preparation_notes,
      clinician_instructions: current.clinician_instructions,
      follow_up_date: current.follow_up_date,
      notes: current.notes,
      gig_platforms: current.gig_platforms,
      gig_earnings_goal: current.gig_earnings_goal,
      reminder_lead_minutes: current.reminder_lead_minutes,
      recurrence_rule: current.recurrence_rule,
    });
  });
});
