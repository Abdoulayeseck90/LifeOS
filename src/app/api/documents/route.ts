import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { personalDocumentInputSchema } from "@/lib/validation/core";
import { listPersonalDocuments, createPersonalDocument } from "@/services/core/personal-documents";
import { scheduleCustomLeadReminder } from "@/services/core/reminders";

// Metadata only — the file itself is uploaded directly to the
// personal-documents Storage bucket from the browser (documents/
// document-upload-form.tsx) before this ever runs, mirroring
// src/app/api/health/documents/route.ts.

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const documents = await listPersonalDocuments();
    return NextResponse.json({ data: documents });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load documents" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = personalDocumentInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const document = await createPersonalDocument(parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "create",
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
    }

    return NextResponse.json({ data: document }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
  }
}
