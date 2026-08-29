import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { personalDocumentUpdateSchema } from "@/lib/validation/core";
import { getPersonalDocument, updatePersonalDocument, deletePersonalDocument } from "@/services/core/personal-documents";
import { scheduleCustomLeadReminder, cancelRemindersForEntity } from "@/services/core/reminders";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const document = await getPersonalDocument(id);
    if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: document });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load document" }, { status: 500 });
  }
}

// Also the "Rename" and "Pin/Unpin" endpoint — both are just metadata
// fields on this same PATCH, not separate actions server-side.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const parsed = personalDocumentUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const document = await updatePersonalDocument(id, parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "update",
      p_entity_type: "personal_document",
      p_entity_id: document.id,
      p_metadata: null,
    });

    if (document.expiration_date && document.reminder_lead_days && document.reminders_enabled) {
      await scheduleCustomLeadReminder({
        relatedEntityType: "personal_document",
        relatedEntityId: document.id,
        targetDate: document.expiration_date,
        leadDays: document.reminder_lead_days,
        category: "documents",
        title: document.name,
      });
    } else {
      await cancelRemindersForEntity("personal_document", document.id);
    }

    return NextResponse.json({ data: document });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    await cancelRemindersForEntity("personal_document", id);
    await deletePersonalDocument(id);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "delete",
      p_entity_type: "personal_document",
      p_entity_id: id,
      p_metadata: null,
    });

    return NextResponse.json({ data: { id } });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
