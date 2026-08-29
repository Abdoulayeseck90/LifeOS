import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPersonalDocument } from "@/services/core/personal-documents";

// Mirrors src/app/api/health/documents/[id]/signed-url/route.ts — a
// short-lived signed URL generated on demand, never embedded in the
// page at render time (Section 78: "Do not expose public file URLs").
const SIGNED_URL_EXPIRY_SECONDS = 120;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // RLS-scoped to the caller's own rows — a document belonging to
  // another user resolves to null here, not a leak.
  const document = await getPersonalDocument(id);
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from("personal-documents")
    .createSignedUrl(document.storage_path, SIGNED_URL_EXPIRY_SECONDS);

  if (error || !data) {
    return NextResponse.json({ error: "Failed to create signed URL" }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
