import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { listGigTaxExportSnapshots } from "@/services/work/gig-tax-export";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const taxYearParam = params.get("tax_year");
  const taxYear = taxYearParam ? Number(taxYearParam) : undefined;

  try {
    const snapshots = await listGigTaxExportSnapshots(taxYear);
    return NextResponse.json({ data: snapshots });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load past exports" }, { status: 500 });
  }
}
