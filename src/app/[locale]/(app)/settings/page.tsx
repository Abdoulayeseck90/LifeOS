import { getTranslations } from "next-intl/server";
import { syncTwoFactorStatus } from "@/services/core/profile";
import { listMyActivePushSubscriptions } from "@/services/core/push-subscriptions";
import { getCalendarFeedStatus } from "@/services/core/calendar-feed";
import { ProfileForm } from "@/components/core/profile-form";
import { NotificationPreferencesForm } from "@/components/core/notification-preferences-form";
import { PushNotificationSettings } from "@/components/core/push-notification-settings";
import { AppleCalendarSettings } from "@/components/core/apple-calendar-settings";
import { TwoFactorEnrollment } from "@/components/core/two-factor-enrollment";
import { SignOutButton } from "@/components/core/sign-out-button";

// Per-user data behind auth — never statically prerendered.
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  const [profile, pushDevices, calendarFeedStatus] = await Promise.all([
    syncTwoFactorStatus(),
    listMyActivePushSubscriptions(),
    getCalendarFeedStatus(),
  ]);

  // Null only when the (app) layout's redirect races this fetch for an
  // unauthenticated request — the redirect wins before this ever renders.
  if (!profile) return null;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-3xl font-semibold text-secondary">{t("title")}</h1>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-secondary">{t("profile")}</h2>
        <ProfileForm profile={profile} />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-secondary">{t("twoFactor.title")}</h2>
        <TwoFactorEnrollment enrolledInitially={profile.two_factor_enabled} />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-secondary">{t("notifications")}</h2>
        <p className="mb-4 max-w-lg text-sm text-muted">{t("notificationsSubtitle")}</p>
        <div className="mb-6 max-w-lg">
          <PushNotificationSettings initialDevices={pushDevices} />
        </div>
        <NotificationPreferencesForm profile={profile} />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-secondary">{t("calendar")}</h2>
        <div className="max-w-lg">
          <AppleCalendarSettings initialStatus={calendarFeedStatus} />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-secondary">{t("dataPrivacy.title")}</h2>
        <div className="flex flex-col divide-y divide-surface rounded-card border border-surface bg-white">
          <div className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm font-medium text-secondary">{t("dataPrivacy.exportData")}</p>
              <p className="text-xs text-muted">{t("dataPrivacy.exportDataDescription")}</p>
            </div>
            <button
              type="button"
              disabled
              className="shrink-0 rounded border border-surface px-3 py-1.5 text-xs text-muted opacity-60"
            >
              {t("dataPrivacy.comingSoon")}
            </button>
          </div>
          <div className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm font-medium text-secondary">{t("dataPrivacy.deleteAccount")}</p>
              <p className="text-xs text-muted">{t("dataPrivacy.deleteAccountDescription")}</p>
            </div>
            <button
              type="button"
              disabled
              className="shrink-0 rounded border border-surface px-3 py-1.5 text-xs text-muted opacity-60"
            >
              {t("dataPrivacy.comingSoon")}
            </button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-secondary">{t("account.title")}</h2>
        <SignOutButton />
      </section>
    </div>
  );
}
