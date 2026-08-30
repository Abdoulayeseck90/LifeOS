import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { duaInputSchema } from "@/lib/validation/core";
import { listDuas, createDua } from "@/services/core/duas";

// RLS already scopes the list to built-in rows + the caller's own
// personal Duas (migration 0041) — no filtering needed here.
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const duas = await listDuas();
    return NextResponse.json({ data: duas });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load Duas" }, { status: 500 });
  }
}

// Personal Duas only — see createDua() in services/core/duas.ts for why
// is_builtin/verification_status/created_by are never accepted here.
export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = duaInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const dua = await createDua(parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "create",
      p_entity_type: "dua",
      p_entity_id: dua.id,
      p_metadata: null,
    });

    return NextResponse.json({ data: dua }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create Dua" }, { status: 500 });
  }
}
