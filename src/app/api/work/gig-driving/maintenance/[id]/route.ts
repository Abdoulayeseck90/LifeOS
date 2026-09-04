import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { gigVehicleMaintenanceUpdateSchema } from "@/lib/validation/work";
import { updateGigVehicleMaintenance, deleteGigVehicleMaintenance } from "@/services/work/gig-driving";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const parsed = gigVehicleMaintenanceUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const record = await updateGigVehicleMaintenance(id, parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "update",
      p_entity_type: "gig_vehicle_maintenance",
      p_entity_id: record.id,
      p_metadata: null,
    });

    return NextResponse.json({ data: record });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update maintenance record" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    await deleteGigVehicleMaintenance(id);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "delete",
      p_entity_type: "gig_vehicle_maintenance",
      p_entity_id: id,
      p_metadata: null,
    });

    return NextResponse.json({ data: { id } });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete maintenance record" }, { status: 500 });
  }
}
