import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { gigTaxExportFilterSchema } from "@/lib/validation/work";
import { buildGigTaxExportData } from "@/services/work/gig-tax-export";
import { buildTaxWorkbookXlsx } from "@/lib/work/gig-tax-export-files";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const parsed = gigTaxExportFilterSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const data = await buildGigTaxExportData(parsed.data);
    const xlsx = await buildTaxWorkbookXlsx(data);
    return new NextResponse(new Uint8Array(xlsx), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${data.taxYear}-Gig-Tax-Records.xlsx"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to generate Excel export" }, { status: 500 });
  }
}
