import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { noteInputSchema } from "@/lib/validation/core";
import { listNotes, createNote } from "@/services/core/notes";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const notes = await listNotes();
    return NextResponse.json({ data: notes });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load notes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const parsed = noteInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const note = await createNote(parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "create",
      p_entity_type: "note",
      p_entity_id: note.id,
      p_metadata: null,
    });

    return NextResponse.json({ data: note }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}
