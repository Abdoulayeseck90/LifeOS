import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { GigTaxExport, GigPlatform } from "@/types/work/entities";
import { listGigShiftsWithRelations, listGigVehicles, listGigExpenses, listGigVehicleMaintenance, getGigTaxSettingsForYear } from "@/services/work/gig-driving";
import { listPersonalDocuments } from "@/services/core/personal-documents";
import { computeGigTaxExport, type GigTaxExportData } from "@/lib/work/gig-tax-export";

// Every tax-export route (preview/csv/xlsx/pdf/package) needs the exact
// same data assembly -- fetched once here via the existing service
// functions already built for the Gig Driving module, no new list
// queries. Filtering by year/vehicle/platform happens inside
// computeGigTaxExport itself.
export async function buildGigTaxExportData(filters: { tax_year: number; vehicle_id?: string; platforms?: GigPlatform[] }): Promise<GigTaxExportData> {
  const [shifts, vehicles, expenses, maintenance, documents, taxSettings] = await Promise.all([
    listGigShiftsWithRelations(),
    listGigVehicles(),
    listGigExpenses(),
    listGigVehicleMaintenance(),
    listPersonalDocuments(),
    getGigTaxSettingsForYear(filters.tax_year),
  ]);

  return computeGigTaxExport({
    shifts,
    vehicles,
    expenses,
    maintenance,
    documents,
    taxSettings,
    taxYear: filters.tax_year,
    vehicleId: filters.vehicle_id,
    platforms: filters.platforms,
  });
}

// Tax Filing Export -- a distinct concern from the general CRUD in
// services/work/gig-driving.ts. gig_tax_exports (0051_gig_tax_export.sql)
// is an audit trail of generated "final tax packages" (ZIP downloads
// only), never a lock on the underlying shifts/earnings/expenses.

export async function saveGigTaxExportSnapshot(input: {
  tax_year: number;
  vehicle_id?: string | null;
  platforms?: GigPlatform[] | null;
  income_record_count: number;
  mileage_record_count: number;
  expense_record_count: number;
  total_income: number;
  total_mileage: number;
  total_expenses: number;
  snapshot: unknown;
}): Promise<GigTaxExport> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("gig_tax_exports")
    .insert({
      user_id: user.id,
      tax_year: input.tax_year,
      vehicle_id: input.vehicle_id ?? null,
      platforms: input.platforms ?? null,
      income_record_count: input.income_record_count,
      mileage_record_count: input.mileage_record_count,
      expense_record_count: input.expense_record_count,
      total_income: input.total_income,
      total_mileage: input.total_mileage,
      total_expenses: input.total_expenses,
      snapshot: input.snapshot,
    })
    .select()
    .single();

  if (error) throw error;
  return data as GigTaxExport;
}

// The history list only needs the summary metadata, never the full
// snapshot payload -- omitted from the select to keep this query light.
export type GigTaxExportSummary = Omit<GigTaxExport, "snapshot">;

export async function listGigTaxExportSnapshots(taxYear?: number): Promise<GigTaxExportSummary[]> {
  const supabase = await createClient();
  let query = supabase
    .from("gig_tax_exports")
    .select("id, user_id, tax_year, vehicle_id, platforms, generated_at, income_record_count, mileage_record_count, expense_record_count, total_income, total_mileage, total_expenses, created_at");
  if (taxYear) query = query.eq("tax_year", taxYear);
  const { data, error } = await query.order("generated_at", { ascending: false });
  if (error) throw error;
  return data as GigTaxExportSummary[];
}

// Server-side receipt download for bundling into the ZIP package. Relies
// on the existing "personal_documents_select_own" storage policy
// (0040_personal_documents.sql) -- this runs with the same cookie/RLS-
// bound client every other request uses, no service-role key needed.
export async function downloadPersonalDocumentBytes(storagePath: string): Promise<Buffer> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("personal-documents").download(storagePath);
  if (error || !data) throw error ?? new Error("Failed to download receipt");
  return Buffer.from(await data.arrayBuffer());
}
