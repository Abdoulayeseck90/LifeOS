import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { profileInputSchema } from "@/lib/validation/core";
import { getProfile, updateProfile } from "@/services/core/profile";

// Mirrors src/app/api/health/conditions/route.ts, PATCH instead of POST
// since a profile row always exists by signup time (see profile.ts).

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const profile = await getProfile();
    return NextResponse.json({ data: profile });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = profileInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const profile = await updateProfile(parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "update",
      p_entity_type: "profile",
      p_entity_id: profile.id,
      p_metadata: null,
    });

    return NextResponse.json({ data: profile });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
