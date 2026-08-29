"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, X } from "lucide-react";
import { computePushUiStatus, enablePushNotifications } from "@/lib/push/client";

const DISMISSED_KEY = "lifeos:push-banner-dismissed";

// Spec Section 3: explain the benefit BEFORE ever calling
// Notification.requestPermission() — the native browser prompt only
// fires from enablePushNotifications(), which only runs when the user
// taps "Enable Notifications" here, never on page load. Dismissed once
// (either via "Not now" or by successfully enabling) and never shown
// again — Section 3: "Do not repeatedly ask for permission."
export function PushPermissionBanner() {
  const t = useTranslations("push");
  const [visible, setVisible] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;
    const status = computePushUiStatus();
    // Only the "ask" state gets this banner — already enabled, denied,
    // or genuinely unsupported all have nothing useful to prompt for
    // here (denied/unsupported guidance lives in Settings instead,
    // where the user went looking for it).
    if (status === "not-enabled") setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  async function handleEnable() {
    setEnabling(true);
    setError(null);
    const result = await enablePushNotifications();
    setEnabling(false);

    if (result.ok) {
      dismiss();
      return;
    }
    if (result.reason === "denied") {
      dismiss();
      return;
    }
    setError(t("enableError"));
  }

  if (!visible) return null;

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-card border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex gap-3">
        <Bell size={20} className="mt-0.5 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-semibold text-secondary">{t("banner.title")}</p>
          <p className="mt-1 text-sm text-muted">{t("banner.description")}</p>
          {error && <p className="mt-1 text-sm text-status-urgent">{error}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 self-end sm:self-start">
        <button
          type="button"
          onClick={dismiss}
          className="min-h-11 rounded border border-surface px-3 text-sm text-secondary hover:bg-white"
        >
          {t("banner.notNow")}
        </button>
        <button
          type="button"
          onClick={handleEnable}
          disabled={enabling}
          className="min-h-11 rounded bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {enabling ? t("enabling") : t("banner.enable")}
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("banner.notNow")}
          className="hidden h-11 w-11 shrink-0 items-center justify-center rounded text-muted hover:bg-white sm:flex"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
