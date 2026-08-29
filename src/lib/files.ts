// Security audit finding: every upload form built its Storage object key
// from the raw, unsanitized browser File.name. Cross-user path traversal
// isn't actually possible (Storage RLS pins every insert to the caller's
// own auth.uid(), never client input), but an unsanitized name can still
// break Content-Disposition/downstream filename assumptions — so this
// strips path separators/traversal sequences/control characters and caps
// length, shared by every upload form rather than repeated per-form.
export function sanitizeFileName(name: string): string {
  const base = name.replace(/^.*[\\/]/, "");
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "");
  return (cleaned || "file").slice(-200);
}
