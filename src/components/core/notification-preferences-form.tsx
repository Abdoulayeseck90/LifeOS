"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Profile } from "@/types/core/entities";
import { NOTIFICATION_CATEGORIES, mergeNotificationPreferences } from "@/lib/notifications/preferences";

// IANA zone list — computed once at module scope, not per render.
// Intl.supportedValuesOf is available in every modern browser and in
// the Node runtime this app already targets; no new dependency needed
// for something the platform already provides.
const TIMEZONES: string[] = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["UTC"];

const EMAIL_TIMING_KEYS = ["seven_day", "three_day", "one_day", "day_of"] as const;

// Notification Timing & Email Rules addendum: the full per-category x
// per-channel x per-lead-time matrix, replacing the old single
// email_reminders_enabled boolean. One PATCH to /api/profile sends the
// whole notification_preferences object (a jsonb column update replaces
// it wholesale — see lib/validation/core.ts), so this form always holds
// and submits the complete shape, never a partial diff.
//
// prefs is guaranteed complete by the time it reaches render: getProfile()
// (services/core/profile.ts) already runs every profile through
// mergeNotificationPreferences before this component ever sees it, and
// the state initializer below runs the *same* canonical merge again as a
// second, cheap line of defense — not per-access optional chaining, which
// would just hide a bad shape instead of fixing it once at the boundary.
export function NotificationPreferencesForm({ profile }: { profile: Profile }) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [prefs, setPrefs] = useState(() => mergeNotificationPreferences(profile.notification_preferences));
  const [timezone, setTimezone] = useState(profile.timezone);

  // A profile that has never set its own timezone still carries the
  // migration's 'UTC' default — offer the browser's detected zone
  // instead of silently defaulting everyone to UTC. Done in an effect
  // (not the initial state) so server and first client render match
  // exactly — the server has no way to know the browser's zone.
  useEffect(() => {
    if (profile.timezone !== "UTC") return;
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected) setTimezone(detected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [testEmailState, setTestEmailState] = useState<
    { status: "idle" } | { status: "sending" } | { status: "sent"; sentTo: string } | { status: "error"; message: string }
  >({ status: "idle" });

  function toggleCategory(category: (typeof NOTIFICATION_CATEGORIES)[number], channel: "push" | "in_app" | "email") {
    setPrefs((prev) => ({
      ...prev,
      [category]: { ...prev[category], [channel]: !prev[category][channel] },
    }));
  }

  function toggleEmailTiming(key: (typeof EMAIL_TIMING_KEYS)[number]) {
    setPrefs((prev) => ({
      ...prev,
      email_timing: { ...prev.email_timing, [key]: !prev.email_timing[key] },
    }));
  }

  async function handleSendTestEmail() {
    setTestEmailState({ status: "sending" });

    const response = await fetch("/api/notifications/test-email", { method: "POST" });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setTestEmailState({ status: "error", message: body?.error ?? t("testEmailError") });
      return;
    }

    setTestEmailState({ status: "sent", sentTo: body.data.sentTo });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);

    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notification_preferences: prefs, timezone }),
    });

    setSubmitting(false);

    if (!response.ok) {
      setError(t("saveError"));
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {error && <p className="text-sm text-status-urgent">{error}</p>}
        {saved && <p className="text-sm text-status-normal">{t("saved")}</p>}

        <div>
          <h3 className="mb-2 text-sm font-semibold text-secondary">{t("healthNotifications")}</h3>
          <div className="flex flex-col divide-y divide-surface rounded-card border border-surface bg-white">
            {NOTIFICATION_CATEGORIES.map((category) => (
              <div key={category} className="flex items-center justify-between gap-4 p-3">
                <div>
                  <p className="text-sm font-medium text-secondary">{t(`categories.${category}.label`)}</p>
                  <p className="text-xs text-muted">{t(`categories.${category}.description`)}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-secondary">
                    <input
                      type="checkbox"
                      checked={prefs[category].push}
                      onChange={() => toggleCategory(category, "push")}
                    />
                    {t("push")}
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-secondary">
                    <input
                      type="checkbox"
                      checked={prefs[category].in_app}
                      onChange={() => toggleCategory(category, "in_app")}
                    />
                    {t("inApp")}
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-secondary">
                    <input
                      type="checkbox"
                      checked={prefs[category].email}
                      onChange={() => toggleCategory(category, "email")}
                    />
                    {t("email")}
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-secondary">{t("emailReminderTiming")}</h3>
          <div className="grid grid-cols-2 gap-2">
            {EMAIL_TIMING_KEYS.map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm text-secondary">
                <input type="checkbox" checked={prefs.email_timing[key]} onChange={() => toggleEmailTiming(key)} />
                {t(`timing.${key}`)}
              </label>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-secondary">{t("overdue")}</h3>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-secondary">
              <input
                type="checkbox"
                checked={prefs.overdue_email_enabled}
                onChange={() => setPrefs((prev) => ({ ...prev, overdue_email_enabled: !prev.overdue_email_enabled }))}
              />
              {t("overdueEmailEnabled")}
            </label>
            <label className="flex items-center gap-2 text-sm text-secondary">
              <input
                type="checkbox"
                disabled={!prefs.overdue_email_enabled}
                checked={prefs.overdue_email_recurring}
                onChange={() =>
                  setPrefs((prev) => ({ ...prev, overdue_email_recurring: !prev.overdue_email_recurring }))
                }
              />
              {t("overdueEmailRecurring")}
            </label>
          </div>
        </div>

        <label className="flex max-w-xs flex-col gap-1 text-sm text-muted">
          {t("timezone")}
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
          >
            {!TIMEZONES.includes(timezone) && <option value={timezone}>{timezone}</option>}
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-fit rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {tCommon("save")}
        </button>
      </form>

      <div className="border-t border-surface pt-4">
        <p className="mb-2 text-sm text-secondary">{t("testEmailDescription")}</p>
        {testEmailState.status === "sent" && (
          <p className="mb-2 text-sm text-status-normal">{t("testEmailSent", { email: testEmailState.sentTo })}</p>
        )}
        {testEmailState.status === "error" && (
          <p className="mb-2 text-sm text-status-urgent">{testEmailState.message}</p>
        )}
        <button
          type="button"
          onClick={handleSendTestEmail}
          disabled={testEmailState.status === "sending"}
          className="w-fit rounded border border-surface px-4 py-2 text-sm text-secondary disabled:opacity-50"
        >
          {testEmailState.status === "sending" ? tCommon("loading") : t("sendTestEmail")}
        </button>
      </div>
    </div>
  );
}
