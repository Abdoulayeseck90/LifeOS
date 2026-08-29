"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

type Status = "loading" | "disabled" | "enrolling" | "enabled";

// Spec Section 6.2: 2FA should be available and recommended, not
// silently absent, given the sensitivity of the data this app holds.
// enrolledInitially lets the server-rendered, truthful
// profiles.two_factor_enabled value (services/core/profile.ts,
// syncTwoFactorStatus) seed the initial UI state without a loading
// flash — this component then re-verifies against live Supabase MFA
// state on mount, since that's the actual source of truth.
export function TwoFactorEnrollment({ enrolledInitially }: { enrolledInitially: boolean }) {
  const t = useTranslations("settings.twoFactor");
  const router = useRouter();
  const [status, setStatus] = useState<Status>(enrolledInitially ? "enabled" : "loading");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      const supabase = createClient();
      const { data, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) {
        setError(listError.message);
        setStatus(enrolledInitially ? "enabled" : "disabled");
        return;
      }

      const verifiedFactor = data.totp.find((factor) => factor.status === "verified");
      if (verifiedFactor) {
        setFactorId(verifiedFactor.id);
        setStatus("enabled");
      } else {
        setStatus("disabled");
      }
    }

    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startEnrollment() {
    setError(null);
    const supabase = createClient();
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp" });

    if (enrollError) {
      setError(enrollError.message);
      return;
    }

    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setStatus("enrolling");
  }

  async function handleVerify(event: FormEvent) {
    event.preventDefault();
    if (!factorId) return;

    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (challengeError) {
      setSubmitting(false);
      setError(challengeError.message);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });

    setSubmitting(false);

    if (verifyError) {
      setError(t("invalidCode"));
      return;
    }

    setStatus("enabled");
    setCode("");
    router.refresh();
  }

  async function handleDisable() {
    if (!factorId) return;

    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId });

    setSubmitting(false);

    if (unenrollError) {
      setError(unenrollError.message);
      return;
    }

    setFactorId(null);
    setStatus("disabled");
    router.refresh();
  }

  if (status === "loading") {
    return <p className="text-sm text-muted">{t("checking")}</p>;
  }

  if (status === "enabled") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-status-normal">{t("enabled")}</p>
        {error && <p className="text-sm text-status-urgent">{error}</p>}
        <button
          type="button"
          onClick={handleDisable}
          disabled={submitting}
          className="w-fit rounded border border-surface px-4 py-2 text-sm font-medium text-secondary disabled:opacity-50"
        >
          {t("disable")}
        </button>
      </div>
    );
  }

  if (status === "enrolling") {
    return (
      <form onSubmit={handleVerify} className="flex max-w-sm flex-col gap-3">
        <p className="text-sm text-muted">{t("scanQrCode")}</p>
        {qrCode && <img src={qrCode} alt={t("qrCodeAlt")} className="h-40 w-40" />}
        {secret && <p className="break-all text-xs text-muted">{t("manualEntry")}: {secret}</p>}

        {error && <p className="text-sm text-status-urgent">{error}</p>}

        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("enterCode")}
          <input
            type="text"
            inputMode="numeric"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-fit rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {t("verify")}
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted">{t("description")}</p>
      {error && <p className="text-sm text-status-urgent">{error}</p>}
      <button
        type="button"
        onClick={startEnrollment}
        className="w-fit rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        {t("enable")}
      </button>
    </div>
  );
}
