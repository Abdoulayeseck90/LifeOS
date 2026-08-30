import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type {
  MonitoringPlan,
  MonitoringItem,
  MonitoringIntervalUnit,
  MonitoringItemDisplayStatus,
  Guideline,
} from "@/types/health/entities";

// Follows the Conditions pattern (src/services/health/conditions.ts).

// Read-only, like listTestDefinitions() in labs.ts — guidelines are
// shared reference data maintained by migration/seed, not created
// through the app, so there is no createGuideline().
export async function listGuidelines(): Promise<Guideline[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("guidelines").select("*").order("organization", { ascending: true });

  if (error) throw error;
  return data as Guideline[];
}

export async function listMonitoringPlans(): Promise<MonitoringPlan[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("monitoring_plans")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as MonitoringPlan[];
}

export async function getMonitoringPlan(id: string): Promise<MonitoringPlan | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("monitoring_plans")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as MonitoringPlan | null;
}

export async function createMonitoringPlan(
  input: Pick<MonitoringPlan, "name"> & Partial<Omit<MonitoringPlan, "id" | "user_id" | "name" | "created_at" | "updated_at">>
): Promise<MonitoringPlan> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("monitoring_plans")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as MonitoringPlan;
}

export async function deleteMonitoringPlan(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("monitoring_plans").delete().eq("id", id);
  if (error) throw error;
}

export type MonitoringItemWithGuideline = MonitoringItem & {
  guidelines: Pick<Guideline, "organization" | "title" | "publication_year"> | null;
};

export async function listMonitoringItems(planId?: string): Promise<MonitoringItemWithGuideline[]> {
  const supabase = await createClient();
  let query = supabase
    .from("monitoring_items")
    .select("*, guidelines(organization, title, publication_year)")
    .order("next_due_at", { ascending: true });

  if (planId) {
    query = query.eq("monitoring_plan_id", planId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as MonitoringItemWithGuideline[];
}

export async function getMonitoringItem(id: string): Promise<MonitoringItem | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("monitoring_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as MonitoringItem | null;
}

export async function createMonitoringItem(
  input: Pick<MonitoringItem, "monitoring_plan_id" | "name"> &
    Partial<Omit<MonitoringItem, "id" | "user_id" | "monitoring_plan_id" | "name" | "last_completed_at" | "status" | "created_at" | "updated_at">>
): Promise<MonitoringItem> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("monitoring_items")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as MonitoringItem;
}

function addInterval(date: Date, value: number, unit: MonitoringIntervalUnit): Date {
  const next = new Date(date);
  switch (unit) {
    case "days":
      next.setDate(next.getDate() + value);
      break;
    case "weeks":
      next.setDate(next.getDate() + value * 7);
      break;
    case "months":
      next.setMonth(next.getMonth() + value);
      break;
    case "years":
      next.setFullYear(next.getFullYear() + value);
      break;
  }
  return next;
}

// Addendum Section 11: completing a recurring item calculates the next
// due date from its configured frequency and keeps the item active for
// the next occurrence (same row, not a new one, to avoid unbounded row
// growth for a quarterly item tracked over years). A one-time item (no
// interval configured) is marked completed instead. The completion note
// itself is not persisted here — the API route attaches it to the
// timeline event it writes, rather than overwriting the item's own
// standing `notes` (its rationale for existing) with a one-off log line.
export async function completeMonitoringItem(id: string, completedAt?: string): Promise<MonitoringItem> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Not authenticated");

  const item = await getMonitoringItem(id);
  if (!item) throw new Error("Monitoring item not found");

  const completionDate = completedAt ?? new Date().toISOString().slice(0, 10);

  let nextDueAt: string | null = null;
  let status: MonitoringItem["status"] = "completed";

  if (item.interval_value && item.interval_unit) {
    nextDueAt = addInterval(new Date(completionDate), item.interval_value, item.interval_unit)
      .toISOString()
      .slice(0, 10);
    status = "active";
  }

  const { data, error } = await supabase
    .from("monitoring_items")
    .update({ last_completed_at: completionDate, next_due_at: nextDueAt, status })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as MonitoringItem;
}

// Addendum Section 11: "The user must be able to manually edit the next
// due date" — independent of the automatic calculation above.
export async function updateMonitoringItemNextDue(id: string, nextDueAt: string): Promise<MonitoringItem> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("monitoring_items")
    .update({ next_due_at: nextDueAt })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as MonitoringItem;
}

export async function deleteMonitoringItem(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("monitoring_items").delete().eq("id", id);
  if (error) throw error;
}

const DUE_SOON_WINDOW_DAYS = 14;

// upcoming/due_soon/due/overdue are computed here rather than stored —
// see the migration file comment for why. referenceDate defaults to
// today but is a parameter so this stays pure/testable.
export function getMonitoringItemDisplayStatus(
  item: Pick<MonitoringItem, "status" | "next_due_at">,
  referenceDate: Date = new Date()
): MonitoringItemDisplayStatus {
  if (item.status !== "active") return item.status;
  if (!item.next_due_at) return "upcoming";

  const today = new Date(referenceDate.toISOString().slice(0, 10));
  const dueDate = new Date(item.next_due_at);
  const daysUntilDue = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue === 0) return "due";
  if (daysUntilDue <= DUE_SOON_WINDOW_DAYS) return "due_soon";
  return "upcoming";
}
