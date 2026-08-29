"use client";

import { useParams } from "next/navigation";
import type { Notification } from "@/types/core/entities";
import { getNotificationHref } from "@/lib/notifications/routing";
import { useRouter } from "@/lib/i18n/navigation";

// Whole row is the click target (Spec Section 9: "Clicking a
// notification should take the user to the relevant LifeOS page") —
// marks it read (fire-and-forget; the navigation itself is what matters
// to the user) and navigates in one action, replacing the old separate
// "mark read" link + static card.
export function NotificationListItem({ notification }: { notification: Notification }) {
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();

  function handleClick() {
    if (!notification.read) {
      fetch(`/api/notifications/${notification.id}/read`, { method: "POST" }).catch(() => undefined);
    }
    router.push(getNotificationHref(notification.related_entity_type));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full rounded-card border border-surface p-4 text-left hover:border-primary/40 ${notification.read ? "bg-white" : "bg-primary/5"}`}
    >
      <p className="font-medium text-secondary">{notification.title}</p>
      {notification.body && <p className="mt-1 text-sm text-muted">{notification.body}</p>}
      <p className="mt-1 text-xs text-muted">
        {new Date(notification.created_at).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
      </p>
    </button>
  );
}
