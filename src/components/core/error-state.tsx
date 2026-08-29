"use client";

// Friendly, non-technical error fallback — the real error (stack trace,
// Supabase message, etc.) belongs in server/console logs only, never in
// front of the user (Master Redesign Section 24). Used directly by
// (app)/error.tsx and reusable by any page-level try/catch UI.
export function ErrorState({
  title,
  message,
  onRetry,
  retryLabel,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
      <p className="text-lg font-semibold text-secondary">{title}</p>
      <p className="max-w-sm text-sm text-muted">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
