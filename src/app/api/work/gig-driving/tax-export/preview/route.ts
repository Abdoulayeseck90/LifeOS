import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { gigTaxExportFilterSchema } from "@/lib/validation/work";
import { buildGigTaxExportData } from "@/services/work/gig-tax-export";

// Powers "Review Tax Year" -- the itemized breakdown shown before any
// file is generated. No snapshot is persisted here (that only happens
// for the full ZIP package, on generate).
export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const parsed = gigTaxExportFilterSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const data = await buildGigTaxExportData(parsed.data);
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: "Failed to build tax year review" }, { status: 500 });
  }
}
