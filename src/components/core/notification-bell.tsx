"use client";

import * as Popover from "@radix-ui/react-popover";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import type { Notification } from "@/types/core/entities";
import { getNotificationHref } from "@/lib/notifications/routing";
import { Link, useRouter } from "@/lib/i18n/navigation";

// Header-level summary of the same inbox the full /notifications page
// shows (services/core/notifications.ts) — a fixed-size recent list,
// not a duplicate data source. Built on Radix Popover for the same
// accessible-primitive reason Modal/ConfirmDialog use Dialog/AlertDialog.
export function NotificationBell({
  notifications,
  unreadCount,
}: {
  notifications: Notification[];
  unreadCount: number;
}) {
  const t = useTranslations("notifications");
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  async function handleMarkAllRead() {
    setMarkingAll(true);
    const response = await fetch("/api/notifications/mark-all-read", { method: "POST" });
    setMarkingAll(false);
    if (response.ok) router.refresh();
  }

  async function handleNotificationClick(notification: Notification) {
    setOpen(false);
    if (!notification.read) {
      fetch(`/api/notifications/${notification.id}/read`, { method: "POST" }).catch(() => undefined);
    }
    router.push(getNotificationHref(notification.related_entity_type));
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={t("bellLabel")}
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-secondary hover:bg-surface"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-80 max-w-[calc(100vw-2rem)] rounded-card border border-surface bg-white p-4 shadow-lg"
        >
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-semibold text-secondary">
              {t("title")}
              {unreadCount > 0 ? ` · ${t("unread", { count: unreadCount })}` : ""}
            </p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="text-xs text-primary hover:underline disabled:opacity-50"
              >
                {t("markAllRead")}
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{t("empty")}</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full rounded border border-surface p-2 text-left hover:bg-surface ${notification.read ? "" : "bg-primary/5"}`}
                  >
                    <p className="text-sm font-medium text-secondary">{notification.title}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {new Date(notification.created_at).toLocaleDateString(locale, { dateStyle: "medium" })}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="mt-3 block text-center text-sm text-primary hover:underline"
          >
            {t("viewAll")}
          </Link>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
