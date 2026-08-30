import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { LabResult, TestDefinition, ReferenceStandard } from "@/types/health/entities";
import type { DateRange } from "@/lib/dates/range";

// Follows the Conditions pattern (src/services/health/conditions.ts).
// Joins test_definitions for display since lab_results only stores the
// FK — the UI needs the bilingual test name, not just the id.

export type LabResultWithTest = LabResult & {
  test_definitions: { name_en: string; name_fr: string } | null;
};

// collection_date is a plain `date` column (no time-of-day, no
// timezone ambiguity) — the Date Range Filter's from/to strings apply
// directly, no UTC-boundary conversion needed (contrast appointments/
// vitals below, which are timestamptz).
export async function listLabResults(dateRange?: DateRange): Promise<LabResultWithTest[]> {
  const supabase = await createClient();
  let query = supabase.from("lab_results").select("*, test_definitions(name_en, name_fr)");

  if (dateRange?.from) query = query.gte("collection_date", dateRange.from);
  if (dateRange?.to) query = query.lte("collection_date", dateRange.to);

  const { data, error } = await query.order("collection_date", { ascending: false });

  if (error) throw error;
  return data as unknown as LabResultWithTest[];
}

// test_definitions is shared reference data (Spec Section 11) plus,
// since the Expand Lab Test Selection spec, each user's own custom
// tests — RLS (migration 0023) already restricts rows to "global
// (user_id is null) or mine," so this plain select naturally returns
// both without any extra filtering here.
export async function listTestDefinitions(): Promise<TestDefinition[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("test_definitions")
    .select("*")
    .eq("active", true)
    .order("category", { ascending: true });

  if (error) throw error;
  return data as TestDefinition[];
}

export async function getTestDefinition(id: string): Promise<TestDefinition | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("test_definitions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as TestDefinition | null;
}

// Expand Lab Test Selection spec, Section 13: a test the user typed
// into "+ Add other test" — always is_custom=true, scoped to them via
// RLS's insert policy (auth.uid() = user_id and is_custom = true).
// Never becomes a global test (Section 13's explicit safety rule) —
// there is no separate "promote" path anywhere in the app.
export async function createCustomTestDefinition(input: {
  name: string;
  code?: string;
  category: TestDefinition["category"];
  default_unit?: string;
}): Promise<TestDefinition> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("test_definitions")
    .insert({
      name_en: input.name,
      name_fr: input.name,
      code: input.code ?? null,
      category: input.category,
      default_unit: input.default_unit ?? null,
      is_custom: true,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data as TestDefinition;
}

// Every result for one specific test (Spec: "Redesign Lab Results with
// Clickable Test History" Section 3) — always the FULL history,
// unfiltered by date, since the dedicated test page's "Latest Result"
// and trend chart must never be narrowed by whatever date range the
// history table happens to have selected (same rule as the Vitals
// page's "latest" cards vs. its filtered history section).
export async function listLabResultsByTestDefinition(testDefinitionId: string): Promise<LabResult[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lab_results")
    .select("*")
    .eq("test_definition_id", testDefinitionId)
    .order("collection_date", { ascending: false });

  if (error) throw error;
  return data as LabResult[];
}

// Trusted-external fallback catalog (Universal Reference System spec)
// — a small, curated, shared table (like test_definitions itself),
// never written to by the app, and shared with Vitals/BMI (see
// lib/health/reference-range.ts). listAllReferenceRanges() is for the
// main Lab Results list, which shows many different tests at once —
// one query for the whole (small) lab slice of the catalog, indexed
// client-side by test_definition_id, rather than one round-trip per
// card. Filtered to lab rows only (test_definition_id not null) so it
// never pulls in the Vitals/BMI rows that now share this same table.
export async function listReferenceRangesForTest(testDefinitionId: string): Promise<ReferenceStandard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reference_standards")
    .select("*")
    .eq("test_definition_id", testDefinitionId);

  if (error) throw error;
  return data as ReferenceStandard[];
}

export async function listAllReferenceRanges(): Promise<ReferenceStandard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("reference_standards").select("*").not("test_definition_id", "is", null);

  if (error) throw error;
  return data as ReferenceStandard[];
}

export async function getLabResult(id: string): Promise<LabResult | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lab_results")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as LabResult | null;
}

function computeAbnormalFlag(
  valueNumeric: number | null | undefined,
  referenceLow: number | null | undefined,
  referenceHigh: number | null | undefined
): boolean {
  // Only computable when both the result and the reference range are
  // numeric — qualitative results (value_text) or a text-only reference
  // range are left unflagged rather than guessed at.
  return (
    valueNumeric !== undefined &&
    valueNumeric !== null &&
    ((referenceLow !== undefined && referenceLow !== null && valueNumeric < referenceLow) ||
      (referenceHigh !== undefined && referenceHigh !== null && valueNumeric > referenceHigh))
  );
}

// Re-exported for server-side callers (e.g. dashboard/page.tsx) that
// already import from this module — the implementation itself lives in
// lib/health/lab-level.ts so client components can use it without
// pulling in this file's server-only Supabase import.
export { getLabResultLevel, type LabResultLevel } from "@/lib/health/lab-level";

export async function createLabResult(
  input: Pick<LabResult, "test_definition_id" | "collection_date"> &
    Partial<
      Omit<
        LabResult,
        "id" | "user_id" | "test_definition_id" | "category" | "collection_date" | "abnormal_flag" | "created_at" | "updated_at"
      >
    >
): Promise<LabResult> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Not authenticated");

  // category is denormalized onto lab_results for query convenience, but
  // it must always match the selected test's own category — derive it
  // server-side rather than trusting a client-supplied value that could
  // drift from the actual test_definition row.
  const { data: testDefinition, error: testDefinitionError } = await supabase
    .from("test_definitions")
    .select("category")
    .eq("id", input.test_definition_id)
    .single();

  if (testDefinitionError) throw testDefinitionError;

  const abnormalFlag = computeAbnormalFlag(input.value_numeric, input.reference_low, input.reference_high);

  const { data, error } = await supabase
    .from("lab_results")
    .insert({
      ...input,
      category: testDefinition.category,
      abnormal_flag: abnormalFlag,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data as LabResult;
}

export async function updateLabResult(
  id: string,
  input: Partial<Omit<LabResult, "id" | "user_id" | "category" | "abnormal_flag" | "created_at" | "updated_at">>
): Promise<LabResult> {
  const supabase = await createClient();

  const updates: Partial<LabResult> = { ...input };

  // Re-derive category if the test changed, and recompute abnormal_flag
  // whenever the value or reference range changed — same rationale as
  // createLabResult: never trust a client-sent value for either.
  if (input.test_definition_id) {
    const { data: testDefinition, error: testDefinitionError } = await supabase
      .from("test_definitions")
      .select("category")
      .eq("id", input.test_definition_id)
      .single();
    if (testDefinitionError) throw testDefinitionError;
    updates.category = testDefinition.category;
  }

  if ("value_numeric" in input || "reference_low" in input || "reference_high" in input) {
    const existing = await getLabResult(id);
    if (!existing) throw new Error("Lab result not found");
    updates.abnormal_flag = computeAbnormalFlag(
      "value_numeric" in input ? input.value_numeric : existing.value_numeric,
      "reference_low" in input ? input.reference_low : existing.reference_low,
      "reference_high" in input ? input.reference_high : existing.reference_high
    );
  }

  const { data, error } = await supabase.from("lab_results").update(updates).eq("id", id).select().single();

  if (error) throw error;
  return data as LabResult;
}

export async function deleteLabResult(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("lab_results").delete().eq("id", id);
  if (error) throw error;
}
