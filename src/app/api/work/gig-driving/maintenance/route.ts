import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { gigVehicleMaintenanceInputSchema } from "@/lib/validation/work";
import { listGigVehicleMaintenance, createGigVehicleMaintenance } from "@/services/work/gig-driving";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const vehicleId = new URL(request.url).searchParams.get("vehicle_id") ?? undefined;

  try {
    const records = await listGigVehicleMaintenance(vehicleId);
    return NextResponse.json({ data: records });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load maintenance records" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const parsed = gigVehicleMaintenanceInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const record = await createGigVehicleMaintenance(parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "create",
      p_entity_type: "gig_vehicle_maintenance",
      p_entity_id: record.id,
      p_metadata: null,
    });

    return NextResponse.json({ data: record }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create maintenance record" }, { status: 500 });
  }
}
