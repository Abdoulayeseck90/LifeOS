import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { gigTaxSettingsInputSchema } from "@/lib/validation/work";
import { listGigTaxSettings, upsertGigTaxSettings } from "@/services/work/gig-driving";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const settings = await listGigTaxSettings();
    return NextResponse.json({ data: settings });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load tax settings" }, { status: 500 });
  }
}

// One editable mileage rate per tax year — POST upserts on (user_id,
// tax_year) rather than requiring a separate create/update distinction,
// since the natural key (the year) is always known up front.
export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const parsed = gigTaxSettingsInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const settings = await upsertGigTaxSettings(parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "update",
      p_entity_type: "gig_tax_settings",
      p_entity_id: settings.id,
      p_metadata: { tax_year: settings.tax_year },
    });

    return NextResponse.json({ data: settings });
  } catch (err) {
    return NextResponse.json({ error: "Failed to save tax settings" }, { status: 500 });
  }
}
