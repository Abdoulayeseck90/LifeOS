import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { documentInputSchema } from "@/lib/validation/health";
import { listDocuments, createDocument } from "@/services/core/documents";
import { createTimelineEvent } from "@/services/core/timeline";
import { createGeneralActivityNotification } from "@/services/core/reminders";

// Mirrors src/app/api/health/conditions/route.ts. Metadata only — the
// file itself is uploaded directly to Storage from the browser
// (src/components/health/document-upload-form.tsx) before this runs.

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const documents = await listDocuments();
    return NextResponse.json({ data: documents });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load documents" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = documentInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const document = await createDocument(parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "create",
      p_entity_type: "document",
      p_entity_id: document.id,
      p_metadata: null,
    });

    await createTimelineEvent({
      event_type: "document",
      date_time: document.document_date ? new Date(document.document_date).toISOString() : new Date().toISOString(),
      title: document.name,
      domain: "health",
      related_entity_type: "document",
      related_entity_id: document.id,
    });

    await createGeneralActivityNotification({
      title: "Document uploaded",
      relatedEntityType: "document",
      relatedEntityId: document.id,
    });

    return NextResponse.json({ data: document }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
  }
}
