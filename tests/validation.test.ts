import { describe, it, expect } from "vitest";
import {
  labResultInputSchema,
  monitoringItemInputSchema,
  diagnosticTestInputSchema,
  documentInputSchema,
} from "@/lib/validation/health";

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
