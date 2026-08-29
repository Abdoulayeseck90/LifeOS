"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell, Smartphone } from "lucide-react";
import type { PushSubscriptionRecord } from "@/types/core/entities";
import { computePushUiStatus, enablePushNotifications, type PushUiStatus } from "@/lib/push/client";
import { ConfirmDialog } from "@/components/core/confirm-dialog";

// Settings → Notifications → "Push Notifications" (Spec Section 18):
// enable/status + "Your Devices" (Spec Section 19). Status is computed
// client-side (Notification.permission only exists in the browser) —
// server-rendered devices list is the initial paint, this component
// hydrates the actual push status on mount.
export function PushNotificationSettings({ initialDevices }: { initialDevices: PushSubscriptionRecord[] }) {
  const t = useTranslations("push");
  const router = useRouter();

  const [status, setStatus] = useState<PushUiStatus | null>(null);
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState(initialDevices);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    setStatus(computePushUiStatus());
  }, []);

  async function handleEnable() {
    setEnabling(true);
    setError(null);
    const result = await enablePushNotifications();
    setEnabling(false);
    setStatus(computePushUiStatus());

    if (!result.ok) {
      if (result.reason === "error") setError(result.message ?? t("enableError"));
      return;
    }
    router.refresh();
  }

  async function handleRemoveDevice(id: string) {
    setRemovingId(id);
    const response = await fetch(`/api/push/subscriptions/${id}`, { method: "DELETE" });
    setRemovingId(null);
    if (response.ok) {
      setDevices((prev) => prev.filter((d) => d.id !== id));
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-card border border-surface bg-white p-4">
        <div className="mb-2 flex items-center gap-2">
          <Bell size={18} className="text-muted" />
          <p className="text-sm font-semibold text-secondary">{t("sectionTitle")}</p>
        </div>

        {status === "ios-needs-install" && (
          <div className="text-sm text-muted">
            <p className="mb-2">{t("iosSteps.title")}</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>{t("iosSteps.step1")}</li>
              <li>{t("iosSteps.step2")}</li>
              <li>{t("iosSteps.step3")}</li>
            </ol>
          </div>
        )}

        {status === "unsupported" && <p className="text-sm text-muted">{t("status.unsupported")}</p>}

        {status === "denied" && <p className="text-sm text-muted">{t("status.denied")}</p>}

        {status === "enabled" && (
          <p className="text-sm text-status-normal">{t("status.enabled")}</p>
        )}

        {status === "not-enabled" && (
          <>
            <p className="mb-3 text-sm text-muted">{t("status.notEnabled")}</p>
            {error && <p className="mb-2 text-sm text-status-urgent">{error}</p>}
            <button
              type="button"
              onClick={handleEnable}
              disabled={enabling}
              className="min-h-11 rounded bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {enabling ? t("enabling") : t("enableButton")}
            </button>
          </>
        )}
      </div>

      <div className="rounded-card border border-surface bg-white p-4">
        <p className="mb-3 text-sm font-semibold text-secondary">{t("devices.title")}</p>
        {devices.length === 0 ? (
          <p className="text-sm text-muted">{t("devices.empty")}</p>
        ) : (
          <div className="flex flex-col divide-y divide-surface">
            {devices.map((device) => (
              <div key={device.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <Smartphone size={16} className="text-muted" />
                  <div>
                    <p className="text-sm font-medium text-secondary">{device.device_label ?? t("devices.unknownDevice")}</p>
                    <p className="text-xs text-status-normal">{t("devices.active")}</p>
                  </div>
                </div>
                <ConfirmDialog
                  trigger={(open) => (
                    <button
                      type="button"
                      onClick={open}
                      disabled={removingId === device.id}
                      className="min-h-11 shrink-0 rounded border border-surface px-3 text-xs text-status-urgent hover:bg-surface disabled:opacity-50"
                    >
                      {t("devices.remove")}
                    </button>
                  )}
                  title={t("devices.removeConfirmTitle")}
                  description={t("devices.removeConfirmMessage")}
                  onConfirm={() => handleRemoveDevice(device.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
