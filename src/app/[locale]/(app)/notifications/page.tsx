import { getTranslations } from "next-intl/server";
import { listNotifications } from "@/services/core/notifications";
import { NotificationListItem } from "@/components/core/notification-list-item";

// Core-level, not Health-specific (Addendum Section 12) — the delivery
// inbox for the generic reminder engine (services/core/reminders.ts).
// Per-user data behind auth — never statically prerendered.
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const t = await getTranslations("notifications");
  const notifications = await listNotifications();

  return (
    <div>
      <h1 className="mb-6 text-3xl font-semibold text-secondary">{t("title")}</h1>

      {notifications.length === 0 ? (
        <div className="rounded-card border border-dashed border-surface p-8 text-center">
          <p className="text-sm text-muted">{t("empty")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((notification) => (
            <NotificationListItem key={notification.id} notification={notification} />
          ))}
        </div>
      )}
    </div>
  );
}
