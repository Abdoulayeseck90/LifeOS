import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { UserFacingError } from "@/lib/errors";
import type { GigVehicle, GigVehicleMaintenance, GigShift, GigExpense, GigTaxSettings, GigShiftEarningInput, GigShiftExpenseInput } from "@/types/work/entities";
import type { GigShiftWithRelations } from "@/lib/work/gig-calculations";

// Gig Driving work module (0050_gig_driving.sql). Follows the Conditions
// pattern (src/services/health/conditions.ts) for plain CRUD; startShift/
// endShift below follow the pay_bill()/end_gig_shift() atomic-RPC
// pattern from Bills/Debt (services/core/bills.ts).

// ---- Vehicles ----

export async function listGigVehicles(): Promise<GigVehicle[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("gig_vehicles").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data as GigVehicle[];
}

export async function getGigVehicle(id: string): Promise<GigVehicle | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("gig_vehicles").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as GigVehicle | null;
}

export async function createGigVehicle(input: Partial<Omit<GigVehicle, "id" | "user_id" | "created_at" | "updated_at">>): Promise<GigVehicle> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase.from("gig_vehicles").insert({ ...input, user_id: user.id }).select().single();
  if (error) throw error;
  return data as GigVehicle;
}

export async function updateGigVehicle(id: string, input: Partial<Omit<GigVehicle, "id" | "user_id" | "created_at" | "updated_at">>): Promise<GigVehicle> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("gig_vehicles").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data as GigVehicle;
}

export async function deleteGigVehicle(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("gig_vehicles").delete().eq("id", id);
  if (error) throw error;
}

// ---- Vehicle maintenance ----

export async function listGigVehicleMaintenance(vehicleId?: string): Promise<GigVehicleMaintenance[]> {
  const supabase = await createClient();
  let query = supabase.from("gig_vehicle_maintenance").select("*");
  if (vehicleId) query = query.eq("vehicle_id", vehicleId);
  const { data, error } = await query.order("date", { ascending: false });
  if (error) throw error;
  return data as GigVehicleMaintenance[];
}

export async function createGigVehicleMaintenance(
  input: Pick<GigVehicleMaintenance, "vehicle_id" | "date" | "type"> & Partial<Omit<GigVehicleMaintenance, "id" | "user_id" | "vehicle_id" | "date" | "type" | "created_at" | "updated_at">>
): Promise<GigVehicleMaintenance> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase.from("gig_vehicle_maintenance").insert({ ...input, user_id: user.id }).select().single();
  if (error) throw error;
  return data as GigVehicleMaintenance;
}

export async function updateGigVehicleMaintenance(
  id: string,
  input: Partial<Omit<GigVehicleMaintenance, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<GigVehicleMaintenance> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("gig_vehicle_maintenance").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data as GigVehicleMaintenance;
}

export async function deleteGigVehicleMaintenance(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("gig_vehicle_maintenance").delete().eq("id", id);
  if (error) throw error;
}

// ---- Shifts ----

export async function listGigShifts(fromDate?: string, toDate?: string): Promise<GigShift[]> {
  const supabase = await createClient();
  let query = supabase.from("gig_shifts").select("*");
  if (fromDate) query = query.gte("date", fromDate);
  if (toDate) query = query.lte("date", toDate);
  const { data, error } = await query.order("start_time", { ascending: false });
  if (error) throw error;
  return data as GigShift[];
}

// Joined via PostgREST embedded resources (same pattern as
// services/health/monitoring.ts) rather than N+1 queries — every
// Overview/Analytics/Taxes computation needs a shift's earnings and
// expenses together.
export async function listGigShiftsWithRelations(fromDate?: string, toDate?: string): Promise<GigShiftWithRelations[]> {
  const supabase = await createClient();
  let query = supabase.from("gig_shifts").select("*, earnings:gig_earnings(*), expenses:gig_expenses(*)");
  if (fromDate) query = query.gte("date", fromDate);
  if (toDate) query = query.lte("date", toDate);
  const { data, error } = await query.order("start_time", { ascending: false });
  if (error) throw error;
  return data as unknown as GigShiftWithRelations[];
}

export async function getGigShift(id: string): Promise<GigShift | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("gig_shifts").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as GigShift | null;
}

// The current in-progress shift (if any) — drives both "show Quick End
// instead of Quick Start" and the guard that a second Quick Start
// should never be offered while one is already running (the DB's own
// partial unique index is still the real enforcement; this is just what
// the UI reads to decide what to show).
export async function getInProgressGigShift(): Promise<GigShift | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("gig_shifts").select("*").eq("status", "in_progress").maybeSingle();
  if (error) throw error;
  return data as GigShift | null;
}

export async function startGigShift(input: {
  vehicle_id?: string;
  start_odometer: number;
  platforms: string[];
  scheduled_appointment_id?: string;
  notes?: string;
}): Promise<GigShift> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("gig_shifts")
    .insert({
      user_id: user.id,
      vehicle_id: input.vehicle_id ?? null,
      start_odometer: input.start_odometer,
      platforms: input.platforms,
      scheduled_appointment_id: input.scheduled_appointment_id ?? null,
      notes: input.notes ?? null,
      status: "in_progress",
      start_time: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    // The partial unique index (gig_shifts_one_in_progress_per_user) is
    // the actual guard against a double Quick Start (double-click,
    // retry, two tabs) — a unique_violation here means one already
    // exists, not a generic save failure.
    if (error.code === "23505") {
      throw new UserFacingError("A shift is already in progress. End it before starting a new one.");
    }
    throw error;
  }
  return data as GigShift;
}

export async function endGigShift(
  id: string,
  input: { end_odometer: number; notes?: string; earnings: GigShiftEarningInput[]; expenses: GigShiftExpenseInput[] }
): Promise<GigShift> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("end_gig_shift", {
    p_shift_id: id,
    p_end_time: new Date().toISOString(),
    p_end_odometer: input.end_odometer,
    p_notes: input.notes ?? null,
    p_earnings: input.earnings,
    p_expenses: input.expenses,
  });

  if (error) {
    if (error.message?.includes("Shift not found or already ended")) {
      throw new UserFacingError("This shift was already ended or no longer exists.");
    }
    throw error;
  }
  return data as GigShift;
}

export async function cancelGigShift(id: string): Promise<GigShift> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("gig_shifts").update({ status: "cancelled" }).eq("id", id).select().single();
  if (error) throw error;
  return data as GigShift;
}

export async function deleteGigShift(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("gig_shifts").delete().eq("id", id);
  if (error) throw error;
}

// ---- Expenses (standalone — not every expense belongs to a shift) ----

export async function listGigExpenses(fromDate?: string, toDate?: string): Promise<GigExpense[]> {
  const supabase = await createClient();
  let query = supabase.from("gig_expenses").select("*");
  if (fromDate) query = query.gte("date", fromDate);
  if (toDate) query = query.lte("date", toDate);
  const { data, error } = await query.order("date", { ascending: false });
  if (error) throw error;
  return data as GigExpense[];
}

export async function getGigExpense(id: string): Promise<GigExpense | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("gig_expenses").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as GigExpense | null;
}

export async function createGigExpense(
  input: Pick<GigExpense, "category" | "amount" | "date"> & Partial<Omit<GigExpense, "id" | "user_id" | "category" | "amount" | "date" | "created_at" | "updated_at">>
): Promise<GigExpense> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase.from("gig_expenses").insert({ ...input, user_id: user.id }).select().single();
  if (error) throw error;
  return data as GigExpense;
}

export async function updateGigExpense(id: string, input: Partial<Omit<GigExpense, "id" | "user_id" | "created_at" | "updated_at">>): Promise<GigExpense> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("gig_expenses").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data as GigExpense;
}

export async function deleteGigExpense(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("gig_expenses").delete().eq("id", id);
  if (error) throw error;
}

// ---- Tax settings (one editable mileage rate per tax year) ----

export async function listGigTaxSettings(): Promise<GigTaxSettings[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("gig_tax_settings").select("*").order("tax_year", { ascending: false });
  if (error) throw error;
  return data as GigTaxSettings[];
}

export async function getGigTaxSettingsForYear(taxYear: number): Promise<GigTaxSettings | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("gig_tax_settings").select("*").eq("tax_year", taxYear).maybeSingle();
  if (error) throw error;
  return data as GigTaxSettings | null;
}

export async function upsertGigTaxSettings(input: { tax_year: number; standard_mileage_rate: number; notes?: string }): Promise<GigTaxSettings> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("gig_tax_settings")
    .upsert({ ...input, user_id: user.id }, { onConflict: "user_id,tax_year" })
    .select()
    .single();

  if (error) throw error;
  return data as GigTaxSettings;
}
