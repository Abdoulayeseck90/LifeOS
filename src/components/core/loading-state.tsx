// Route-level loading fallback (see (app)/loading.tsx) and any page that
// wants a consistent "working on it" state instead of a layout jump.
// Deliberately plain (no skeleton shapes per page) — a single shared
// primitive is more honest than hand-tuned skeletons for pages that
// don't exist yet needing one; this can grow per-page skeletons later
// if a specific page's layout jump becomes an actual problem.
export function LoadingState({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-surface border-t-primary" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}
