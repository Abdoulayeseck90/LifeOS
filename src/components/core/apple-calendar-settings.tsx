"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarPlus, Copy, Check, RefreshCw } from "lucide-react";
import type { CalendarFeedStatus } from "@/services/core/calendar-feed";
import { ConfirmDialog } from "@/components/core/confirm-dialog";

// Settings -> Calendar -> Apple Calendar (Spec Section 5/12). The raw
// subscription URL is never persisted server-side (0043_calendar_feed.sql
// only stores a hash), so it can only ever be shown here in the instant
// after Generate/Regenerate succeeds — a returning visit to Settings
// that already has an active link genuinely cannot recover the URL to
// display again, only offer to replace it. That's the security property
// working as intended, not a bug: the raw token existing nowhere except
// the one response that created it, and Apple Calendar's own stored copy.
export function AppleCalendarSettings({ initialStatus }: { initialStatus: CalendarFeedStatus }) {
  const t = useTranslations("settings.appleCalendar");
  const tCommon = useTranslations("common");

  const [hasActiveToken, setHasActiveToken] = useState(initialStatus.hasActiveToken);
  const [subscriptionUrl, setSubscriptionUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setGenerating(true);
    setError(null);
    setCopied(false);

    const response = await fetch("/api/calendar/subscription", { method: "POST" });
    setGenerating(false);

    if (!response.ok) {
      setError(t("generateError"));
      return;
    }

    const { data } = await response.json();
    setSubscriptionUrl(data.url as string);
    setHasActiveToken(true);
  }

  async function handleCopy() {
    if (!subscriptionUrl) return;
    try {
      await navigator.clipboard.writeText(subscriptionUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t("copyError"));
    }
  }

  return (
    <div className="rounded-card border border-surface bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <CalendarPlus size={18} className="text-muted" />
        <p className="text-sm font-semibold text-secondary">{t("title")}</p>
      </div>

      {error && <p className="mb-3 text-sm text-status-urgent">{error}</p>}

      {!hasActiveToken && !subscriptionUrl && (
        <>
          <p className="mb-3 text-sm text-muted">{t("description")}</p>
          <button
            type="button"
            onClick={generate}
            disabled={generating}
            className="min-h-11 rounded bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {generating ? t("generating") : t("generateButton")}
          </button>
        </>
      )}

      {subscriptionUrl && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-secondary">{t("yourLink")}</p>
          <div className="flex flex-col gap-2 rounded border border-surface bg-surface/40 p-3 sm:flex-row sm:items-center">
            <code className="min-w-0 flex-1 break-all text-xs text-secondary">{subscriptionUrl}</code>
            <button
              type="button"
              onClick={handleCopy}
              className="flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded border border-surface bg-white px-3 text-xs font-medium text-secondary hover:bg-surface"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? tCommon("copied") : tCommon("copy")}
            </button>
          </div>

          <p className="text-xs text-muted">{t("securityNote")}</p>

          <details className="text-sm text-muted">
            <summary className="cursor-pointer font-medium text-secondary">{t("howToAdd.title")}</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>{t("howToAdd.step1")}</li>
              <li>{t("howToAdd.step2")}</li>
              <li>{t("howToAdd.step3")}</li>
            </ol>
          </details>

          <RegenerateButton t={t} generating={generating} onConfirm={generate} />
        </div>
      )}

      {hasActiveToken && !subscriptionUrl && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-status-normal">{t("connectedStatus")}</p>
          <RegenerateButton t={t} generating={generating} onConfirm={generate} />
        </div>
      )}
    </div>
  );
}

function RegenerateButton({
  t,
  generating,
  onConfirm,
}: {
  t: ReturnType<typeof useTranslations>;
  generating: boolean;
  onConfirm: () => Promise<void>;
}) {
  return (
    <ConfirmDialog
      trigger={(open) => (
        <button
          type="button"
          onClick={open}
          disabled={generating}
          className="flex min-h-11 w-fit items-center gap-1.5 rounded border border-surface px-3 text-sm text-secondary hover:bg-surface disabled:opacity-50"
        >
          <RefreshCw size={14} />
          {generating ? t("generating") : t("regenerateButton")}
        </button>
      )}
      title={t("regenerateConfirmTitle")}
      description={t("regenerateConfirmMessage")}
      confirmLabel={t("regenerateButton")}
      onConfirm={onConfirm}
    />
  );
}
