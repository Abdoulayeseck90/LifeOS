import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { gigTaxExportFilterSchema } from "@/lib/validation/work";
import { buildGigTaxExportData } from "@/services/work/gig-tax-export";
import { buildTaxCsvBundle } from "@/lib/work/gig-tax-export-files";

// Ad hoc export -- no gig_tax_exports snapshot persisted (only the full
// ZIP "tax package" does that).
export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const parsed = gigTaxExportFilterSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const data = await buildGigTaxExportData(parsed.data);
    const zip = await buildTaxCsvBundle(data);
    return new NextResponse(new Uint8Array(zip), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${data.taxYear}-Gig-Tax-CSV.zip"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to generate CSV export" }, { status: 500 });
  }
}
