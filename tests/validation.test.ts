import { describe, it, expect } from "vitest";
import {
  labResultInputSchema,
  monitoringItemInputSchema,
  diagnosticTestInputSchema,
  documentInputSchema,
} from "@/lib/validation/health";
import { appointmentInputSchema, appointmentBulkInputSchema, workScheduleTimeError } from "@/lib/validation/core";

describe("labResultInputSchema", () => {
  const base = {
    test_definition_id: "11111111-1111-1111-1111-111111111111",
    collection_date: "2026-01-01",
  };

  it("accepts a numeric value alone", () => {
    expect(labResultInputSchema.safeParse({ ...base, value_numeric: 42 }).success).toBe(true);
  });

  it("accepts a text value alone (qualitative results like HBsAg: Positive)", () => {
    expect(labResultInputSchema.safeParse({ ...base, value_text: "Positive" }).success).toBe(true);
  });

  it("rejects a result with neither a numeric nor a text value", () => {
    const result = labResultInputSchema.safeParse(base);
    expect(result.success).toBe(false);
  });

  it("does not accept a client-supplied category — it's derived server-side", () => {
    // category was deliberately removed from the schema (see the comment
    // above labResultInputSchema in src/lib/validation/health.ts) so a
    // client can never send one that disagrees with the selected test's
    // actual category.
    const parsed = labResultInputSchema.safeParse({ ...base, value_numeric: 1, category: "liver" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect("category" in parsed.data).toBe(false);
    }
  });
});

describe("monitoringItemInputSchema", () => {
  const base = {
    monitoring_plan_id: "11111111-1111-1111-1111-111111111111",
    name: "HBV DNA",
  };

  it("accepts an item with both interval_value and interval_unit", () => {
    expect(
      monitoringItemInputSchema.safeParse({ ...base, interval_value: 3, interval_unit: "months" }).success
    ).toBe(true);
  });

  it("accepts an item with neither (frequency_note-only schedules)", () => {
    expect(monitoringItemInputSchema.safeParse({ ...base, frequency_note: "As needed" }).success).toBe(true);
  });

  it("rejects interval_value without interval_unit", () => {
    expect(monitoringItemInputSchema.safeParse({ ...base, interval_value: 3 }).success).toBe(false);
  });

  it("rejects interval_unit without interval_value", () => {
    expect(monitoringItemInputSchema.safeParse({ ...base, interval_unit: "months" }).success).toBe(false);
  });

  it("defaults source to 'user'", () => {
    const parsed = monitoringItemInputSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.source).toBe("user");
  });
});

describe("diagnosticTestInputSchema", () => {
  it("accepts any non-empty test_type string, not a closed set (Addendum Section 2)", () => {
    for (const testType of ["fibroscan", "xray", "some_future_test_type_nobody_has_thought_of_yet"]) {
      expect(
        diagnosticTestInputSchema.safeParse({ test_type: testType, category: "imaging", study_date: "2026-01-01" }).success
      ).toBe(true);
    }
  });

  it("rejects an empty test_type", () => {
    expect(
      diagnosticTestInputSchema.safeParse({ test_type: "", category: "imaging", study_date: "2026-01-01" }).success
    ).toBe(false);
  });

  it("requires category to be one of the 5 fixed top-level categories (Vitals-Diagnostic-Redesign Spec)", () => {
    expect(
      diagnosticTestInputSchema.safeParse({ test_type: "xray", study_date: "2026-01-01" }).success
    ).toBe(false);
    expect(
      diagnosticTestInputSchema.safeParse({ test_type: "xray", category: "not_a_real_category", study_date: "2026-01-01" }).success
    ).toBe(false);
  });

  it("accepts arbitrary measurement keys in the measurements bag", () => {
    const parsed = diagnosticTestInputSchema.safeParse({
      test_type: "fibroscan",
      category: "imaging",
      study_date: "2026-01-01",
      measurements: { liver_stiffness_kpa: 4.2, cap_dbm: 176, fasting_status: true },
    });
    expect(parsed.success).toBe(true);
  });
});

describe("documentInputSchema", () => {
  const base = {
    name: "Lab report",
    type: "lab_report",
    storage_path: "user/doc/file.pdf",
    mime_type: "application/pdf",
    file_size: 1024,
  };

  it("defaults tags and related_lab_result_ids to empty arrays", () => {
    const parsed = documentInputSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.tags).toEqual([]);
      expect(parsed.data.related_lab_result_ids).toEqual([]);
    }
  });

  it("accepts linking to multiple lab results", () => {
    const parsed = documentInputSchema.safeParse({
      ...base,
      related_lab_result_ids: ["11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222"],
    });
    expect(parsed.success).toBe(true);
  });
});

describe("appointmentInputSchema", () => {
  const base = {
    title: "Test appointment",
    date_time: "2026-09-05T21:00:00.000Z",
    category: "personal",
    status: "scheduled",
  };

  // Regression: appointment-form.tsx's buildPayload() always sends an
  // explicit `description: null` when the field is left blank (the
  // common case for a brand-new appointment), not an omitted key. A
  // string-only (non-nullable) schema rejected every such save with a
  // 400, surfaced to the user as "Failed to save. Please try again."
  it("accepts an explicit null description (not just an omitted one)", () => {
    expect(appointmentInputSchema.safeParse({ ...base, description: null }).success).toBe(true);
  });

  it("still accepts an omitted description", () => {
    expect(appointmentInputSchema.safeParse(base).success).toBe(true);
  });

  it("accepts a real description string", () => {
    expect(appointmentInputSchema.safeParse({ ...base, description: "Bring insurance card" }).success).toBe(true);
  });

  it("requires a title or provider_name", () => {
    const { title, ...withoutTitle } = base;
    expect(appointmentInputSchema.safeParse(withoutTitle).success).toBe(false);
    expect(appointmentInputSchema.safeParse({ ...withoutTitle, provider_name: "Dr. Smith" }).success).toBe(true);
  });

  it("accepts a work-category appointment with gig fields and a valid end_time", () => {
    const parsed = appointmentInputSchema.safeParse({
      ...base,
      category: "work",
      end_time: "2026-09-06T03:00:00.000Z",
      gig_platforms: ["doordash", "spark"],
      gig_earnings_goal: 150,
    });
    expect(parsed.success).toBe(true);
  });

  // Gig Driving spec: every work-category schedule must have a real
  // start AND end time so planned duration can always be computed.
  it("rejects a work-category appointment with no end_time", () => {
    const parsed = appointmentInputSchema.safeParse({ ...base, category: "work" });
    expect(parsed.success).toBe(false);
  });

  it("rejects a work-category appointment whose end_time is not after date_time", () => {
    const parsed = appointmentInputSchema.safeParse({ ...base, category: "work", end_time: base.date_time });
    expect(parsed.success).toBe(false);
  });

  it("does not require end_time for a non-work category", () => {
    expect(appointmentInputSchema.safeParse(base).success).toBe(true);
  });
});

describe("workScheduleTimeError", () => {
  it("is null for a non-work category regardless of end_time", () => {
    expect(workScheduleTimeError("personal", "2026-09-05T21:00:00.000Z", null)).toBeNull();
  });

  it("requires end_time for category=work", () => {
    expect(workScheduleTimeError("work", "2026-09-05T21:00:00.000Z", null)).not.toBeNull();
  });

  it("requires end_time to be strictly after date_time for category=work", () => {
    expect(workScheduleTimeError("work", "2026-09-05T21:00:00.000Z", "2026-09-05T21:00:00.000Z")).not.toBeNull();
    expect(workScheduleTimeError("work", "2026-09-05T21:00:00.000Z", "2026-09-05T20:00:00.000Z")).not.toBeNull();
  });

  it("accepts a valid work-category start/end pair, including overnight", () => {
    expect(workScheduleTimeError("work", "2026-09-05T21:00:00.000Z", "2026-09-06T02:00:00.000Z")).toBeNull();
  });
});

describe("appointmentBulkInputSchema", () => {
  it("accepts a batch of valid work-category items", () => {
    const parsed = appointmentBulkInputSchema.safeParse({
      items: [
        { title: "Shift", date_time: "2026-09-18T21:00:00.000Z", end_time: "2026-09-19T02:00:00.000Z", category: "work" },
        { title: "Shift", date_time: "2026-09-19T14:00:00.000Z", end_time: "2026-09-19T19:00:00.000Z", category: "work" },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects the whole batch if any single item is invalid (missing end_time)", () => {
    const parsed = appointmentBulkInputSchema.safeParse({
      items: [
        { title: "Shift", date_time: "2026-09-18T21:00:00.000Z", end_time: "2026-09-19T02:00:00.000Z", category: "work" },
        { title: "Shift", date_time: "2026-09-19T14:00:00.000Z", category: "work" },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an empty batch", () => {
    expect(appointmentBulkInputSchema.safeParse({ items: [] }).success).toBe(false);
  });
});
