import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { Document } from "@/types/core/entities";
import type { DateRange } from "@/lib/dates/range";

// Core-level service (Document is Core, not Health-only — Spec Section
// 3, "Domain separation"). Metadata only; the actual file upload flow
// against the medical-documents storage bucket is not built yet (README
// "Not yet built").

// document_date is a plain `date` column but nullable (Date Range
// Filter spec: "show documents within that period when a document date
// is available"). When a range is active, documents without a
// document_date are excluded — there's no basis to call an undated
// document "within" any period — but with no range active, every
// document shows exactly as before, undated ones included.
export async function listDocuments(dateRange?: DateRange): Promise<Document[]> {
  const supabase = await createClient();
  let query = supabase.from("documents").select("*");

  if (dateRange?.from) query = query.gte("document_date", dateRange.from);
  if (dateRange?.to) query = query.lte("document_date", dateRange.to);

  const { data, error } = await query.order("document_date", { ascending: false });
  if (error) throw error;
  return data as Document[];
}

export async function getDocument(id: string): Promise<Document | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as Document | null;
}

export async function createDocument(
  input: Pick<Document, "name" | "type" | "storage_path" | "mime_type" | "file_size"> &
    Partial<
      Omit<Document, "id" | "user_id" | "name" | "type" | "storage_path" | "mime_type" | "file_size" | "created_at" | "updated_at">
    >
): Promise<Document> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("documents")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as Document;
}

export async function deleteDocument(id: string): Promise<void> {
  const supabase = await createClient();

  const document = await getDocument(id);
  if (!document) return;

  const { error: storageError } = await supabase.storage.from("medical-documents").remove([document.storage_path]);
  if (storageError) throw storageError;

  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw error;
}
