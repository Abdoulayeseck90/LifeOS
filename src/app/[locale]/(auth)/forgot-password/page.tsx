"use client";

import { useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const { locale } = useParams<{ locale: string }>();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/${locale}/reset-password`,
    });

    setSubmitting(false);

    // Always show the same confirmation regardless of outcome — never
    // reveal via a different message/timing whether an email address has
    // an account (a wrong-address enumeration vector otherwise). A real
    // failure (rate limit, provider issue) is still logged server-side
    // by Supabase; no error state exists here on purpose.
    if (resetError) {
      console.error("[auth] resetPasswordForEmail failed:", resetError.message);
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold text-secondary">{t("forgotPassword")}</h1>
        <p className="text-sm text-secondary">{t("resetEmailSent")}</p>
        <p className="text-center text-sm text-muted">
          <Link href={`/${locale}/login`} className="text-primary hover:underline">
            {t("backToSignIn")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-secondary">{t("forgotPassword")}</h1>
      <p className="text-sm text-muted">{t("forgotPasswordInstructions")}</p>

      <label className="flex flex-col gap-1.5 text-sm text-muted">
        {t("email")}
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
        />
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {t("sendResetLink")}
      </button>

      <p className="text-center text-sm text-muted">
        <Link href={`/${locale}/login`} className="text-primary hover:underline">
          {t("backToSignIn")}
        </Link>
      </p>
    </form>
  );
}
