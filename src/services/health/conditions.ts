import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { Condition, Medication, MonitoringItem } from "@/types/health/entities";
import type { Document } from "@/types/core/entities";

// Spec Section 48 architecture rule: "the application must not scatter
// Supabase-specific database calls throughout the UI." Every domain
// gets a service module like this one; components and API routes call
// these functions, never supabase.from(...) directly.

export async function listConditions(): Promise<Condition[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conditions")
    .select("*")
    .order("diagnosis_date", { ascending: false });

  if (error) throw error;
  return data as Condition[];
}

export async function getCondition(id: string): Promise<Condition | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conditions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as Condition | null;
}

export async function createCondition(
  input: Pick<Condition, "name"> & Partial<Omit<Condition, "id" | "user_id" | "name" | "created_at" | "updated_at">>
): Promise<Condition> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("conditions")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as Condition;
}

export async function updateCondition(
  id: string,
  input: Partial<Pick<Condition, "name" | "status" | "diagnosis_date" | "description" | "provider_reference" | "notes">>
): Promise<Condition> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("conditions").update(input).eq("id", id).select().single();

  if (error) throw error;
  return data as Condition;
}

export async function deleteCondition(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("conditions").delete().eq("id", id);
  if (error) throw error;
}

export interface ConditionCrossReferences {
  medications: Medication[];
  monitoringItems: MonitoringItem[];
  documents: Document[];
}

// Section 7 of the redesign spec: a condition's detail view should show
// what else in LifeOS relates to it. All three links already exist in
// the schema (related_condition_id on medications/documents,
// monitoring_plans.condition_id) — no migration needed, just reads
// nobody had wired together yet.
export async function getConditionCrossReferences(conditionId: string): Promise<ConditionCrossReferences> {
  const supabase = await createClient();

  const [medicationsResult, plansResult, documentsResult] = await Promise.all([
    supabase.from("medications").select("*").eq("related_condition_id", conditionId),
    supabase.from("monitoring_plans").select("id").eq("condition_id", conditionId),
    supabase.from("documents").select("*").eq("related_condition_id", conditionId),
  ]);

  if (medicationsResult.error) throw medicationsResult.error;
  if (plansResult.error) throw plansResult.error;
  if (documentsResult.error) throw documentsResult.error;

  const planIds = plansResult.data.map((plan) => plan.id as string);
  let monitoringItems: MonitoringItem[] = [];
  if (planIds.length > 0) {
    const { data, error } = await supabase.from("monitoring_items").select("*").in("monitoring_plan_id", planIds);
    if (error) throw error;
    monitoringItems = data as MonitoringItem[];
  }

  return {
    medications: medicationsResult.data as Medication[],
    monitoringItems,
    documents: documentsResult.data as Document[],
  };
}
