import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDocument } from "@/services/core/documents";

// Spec Section 6.2: "a leaked signed URL to a lab report is a leaked
// lab report" — expiry in minutes, not hours, generated on demand
// rather than embedded in the page at render time.
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

  // getDocument is RLS-scoped to the caller's own rows — a document
  // belonging to another user resolves to null here, not a leak.
  const document = await getDocument(id);
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from("medical-documents")
    .createSignedUrl(document.storage_path, SIGNED_URL_EXPIRY_SECONDS);

  if (error || !data) {
    return NextResponse.json({ error: "Failed to create signed URL" }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
