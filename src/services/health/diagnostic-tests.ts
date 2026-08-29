import { createClient } from "@/lib/supabase/server";
import type { DiagnosticTest } from "@/types/health/entities";
import type { DateRange } from "@/lib/dates/range";

// Follows the Conditions pattern (src/services/health/conditions.ts).

// study_date is a plain `date` column — from/to apply directly, no UTC
// conversion needed (see labs.ts's listLabResults for the same reasoning).
export async function listDiagnosticTests(testType?: string, dateRange?: DateRange): Promise<DiagnosticTest[]> {
  const supabase = await createClient();
  let query = supabase.from("diagnostic_tests").select("*");

  if (testType) query = query.eq("test_type", testType);
  if (dateRange?.from) query = query.gte("study_date", dateRange.from);
  if (dateRange?.to) query = query.lte("study_date", dateRange.to);

  const { data, error } = await query.order("study_date", { ascending: false });
  if (error) throw error;
  return data as DiagnosticTest[];
}

export async function getDiagnosticTest(id: string): Promise<DiagnosticTest | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("diagnostic_tests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as DiagnosticTest | null;
}

export async function createDiagnosticTest(
  input: Pick<DiagnosticTest, "test_type" | "study_date"> &
    Partial<Omit<DiagnosticTest, "id" | "user_id" | "test_type" | "study_date" | "created_at" | "updated_at">>
): Promise<DiagnosticTest> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("diagnostic_tests")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as DiagnosticTest;
}

export async function updateDiagnosticTest(
  id: string,
  input: Partial<Omit<DiagnosticTest, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<DiagnosticTest> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("diagnostic_tests")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as DiagnosticTest;
}

export async function deleteDiagnosticTest(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("diagnostic_tests").delete().eq("id", id);
  if (error) throw error;
}
