import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { duaUserDataUpdateSchema } from "@/lib/validation/core";
import { updateDuaNote } from "@/services/core/dua-user-data";

// Section 20: a private note is a per-user overlay (dua_user_data.notes),
// never visible to any other user regardless of whose Dua it's attached to.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = duaUserDataUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const userData = await updateDuaNote(id, parsed.data.notes ?? "");
    return NextResponse.json({ data: userData });
  } catch (err) {
    return NextResponse.json({ error: "Failed to save note" }, { status: 500 });
  }
}
