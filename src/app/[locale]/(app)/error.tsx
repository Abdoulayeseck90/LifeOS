"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/core/error-state";

// Route-level error boundary for the whole authenticated section
// (Master Redesign Section 24) — Next.js requires this to be a Client
// Component. The real error is logged to the console only (dev tooling/
// server logs already capture it from where it actually threw); the
// user only ever sees a generic, friendly message, never a stack trace
// or a Supabase error string.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorState title={t("errorTitle")} message={t("errorMessage")} onRetry={reset} retryLabel={t("tryAgain")} />;
}
