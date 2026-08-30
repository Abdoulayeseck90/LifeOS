import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { businessInputSchema } from "@/lib/validation/core";
import { listBusinesses, createBusiness } from "@/services/core/businesses";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const businesses = await listBusinesses();
    return NextResponse.json({ data: businesses });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load businesses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const parsed = businessInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const business = await createBusiness(parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "create",
      p_entity_type: "business",
      p_entity_id: business.id,
      p_metadata: null,
    });

    return NextResponse.json({ data: business }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create business" }, { status: 500 });
  }
}
