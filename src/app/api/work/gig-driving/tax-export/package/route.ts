import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { gigTaxExportFilterSchema } from "@/lib/validation/work";
import { buildGigTaxExportData, saveGigTaxExportSnapshot, downloadPersonalDocumentBytes } from "@/services/work/gig-tax-export";
import { buildTaxPackageZip } from "@/lib/work/gig-tax-export-files";

// "Download Tax Package" -- the one export that persists a
// gig_tax_exports audit snapshot (per the spec's own "final tax package"
// framing). Does not lock the underlying shifts/expenses; a later
// package generation for the same year just creates a new snapshot row
// reflecting whatever has changed.
export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const parsed = gigTaxExportFilterSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const data = await buildGigTaxExportData(parsed.data);
    const zip = await buildTaxPackageZip(data, downloadPersonalDocumentBytes);

    const snapshot = await saveGigTaxExportSnapshot({
      tax_year: data.taxYear,
      vehicle_id: data.filters.vehicleId,
      platforms: data.filters.platforms,
      income_record_count: Object.keys(data.income.byPlatform).length,
      mileage_record_count: data.mileage.odometerRecords.length,
      expense_record_count: data.expenses.records.length,
      total_income: data.income.total,
      total_mileage: data.mileage.totalMiles,
      total_expenses: data.expenses.total,
      snapshot: data,
    });

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "create",
      p_entity_type: "gig_tax_export",
      p_entity_id: snapshot.id,
      p_metadata: { tax_year: data.taxYear },
    });

    return new NextResponse(new Uint8Array(zip), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${data.taxYear}-Gig-Tax-Package.zip"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to generate tax package" }, { status: 500 });
  }
}
