import { createClient } from "@/lib/supabase/server";
import type { PersonalDocument } from "@/types/core/entities";
import type { PersonalDocumentUpdateInput } from "@/lib/validation/core";

// Metadata only — the file itself is uploaded directly to the private
// personal-documents Storage bucket from the browser (mirrors
// services/core/documents.ts, Health's Medical Documents) before
// createPersonalDocument ever runs.

export async function listPersonalDocuments(): Promise<PersonalDocument[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("personal_documents").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as PersonalDocument[];
}

export async function getPersonalDocument(id: string): Promise<PersonalDocument | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("personal_documents").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as PersonalDocument | null;
}

export async function createPersonalDocument(
  input: Pick<PersonalDocument, "name" | "storage_path" | "mime_type" | "file_size"> &
    Partial<Omit<PersonalDocument, "id" | "user_id" | "name" | "storage_path" | "mime_type" | "file_size" | "created_at" | "updated_at">>
): Promise<PersonalDocument> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("personal_documents")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as PersonalDocument;
}

export async function updatePersonalDocument(id: string, input: PersonalDocumentUpdateInput): Promise<PersonalDocument> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("personal_documents").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data as PersonalDocument;
}

// Section 79: delete the storage file, then the metadata row, and never
// claim success if either step fails — if the storage remove fails this
// throws before the row delete runs, so nothing is silently orphaned or
// falsely reported as deleted. A receipt-type document linked to an
// Expense only ever severs its own related_expense_id FK (on delete set
// null, declared on the column) — the Expense itself is never touched.
export async function deletePersonalDocument(id: string): Promise<void> {
  const supabase = await createClient();

  const document = await getPersonalDocument(id);
  if (!document) return;

  const { error: storageError } = await supabase.storage.from("personal-documents").remove([document.storage_path]);
  if (storageError) throw storageError;

  const { error } = await supabase.from("personal_documents").delete().eq("id", id);
  if (error) throw error;
}
