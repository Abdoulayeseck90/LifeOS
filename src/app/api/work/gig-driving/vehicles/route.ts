import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { gigVehicleInputSchema } from "@/lib/validation/work";
import { listGigVehicles, createGigVehicle } from "@/services/work/gig-driving";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const vehicles = await listGigVehicles();
    return NextResponse.json({ data: vehicles });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load vehicles" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const parsed = gigVehicleInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const vehicle = await createGigVehicle(parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "create",
      p_entity_type: "gig_vehicle",
      p_entity_id: vehicle.id,
      p_metadata: null,
    });

    return NextResponse.json({ data: vehicle }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create vehicle" }, { status: 500 });
  }
}
