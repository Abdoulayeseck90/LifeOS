import { CalendarDays } from "lucide-react";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { getProfile } from "@/services/core/profile";
import { getUnreadNotificationCount, listRecentNotifications } from "@/services/core/notifications";
import { NotificationBell } from "@/components/core/notification-bell";
import { AccountMenu } from "@/components/core/account-menu";
import { MobileSidebarDrawer } from "@/components/core/mobile-sidebar-drawer";
import { HeaderSearch } from "@/components/core/header-search";
import { Logo } from "@/components/core/logo";
import { LanguageSwitcher } from "@/components/core/language-switcher";

// Global header, present on every authenticated page (Master Redesign
// Section 4). Server component: fetches user/profile/notifications here
// and passes plain serializable props down to the client bell/menu —
// same RSC-boundary pattern used throughout Health (see
// appointment-add-button.tsx for the original comment on why).
//
// Branding note: the wordmark only appears here on phones, where the
// sidebar (which now carries the primary "[logo] LifeOS" lockup — see
// app-sidebar.tsx) is hidden behind the hamburger drawer. Repeating it
// on desktop, where the sidebar is always visible right next to the
// header, would just be the same brand mark shown twice on screen.
export async function Header() {
  const t = await getTranslations("nav");
  const user = await getAuthenticatedUser();

  const [profile, notifications, unreadCount] = await Promise.all([
    getProfile(),
    listRecentNotifications(),
    getUnreadNotificationCount(),
  ]);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-surface bg-white px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <MobileSidebarDrawer />
        <Link href="/dashboard" className="md:hidden">
          <Logo withWordmark />
        </Link>
      </div>
      <div className="flex flex-1 justify-center md:justify-start">
        <HeaderSearch />
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Link
          href="/calendar"
          aria-label={t("calendar")}
          className="flex h-10 w-10 items-center justify-center rounded-full text-secondary hover:bg-surface"
        >
          <CalendarDays size={20} />
        </Link>
        <LanguageSwitcher />
        <NotificationBell notifications={notifications} unreadCount={unreadCount} />
        {profile?.display_name && (
          <span className="hidden max-w-[10rem] truncate text-sm font-medium text-secondary md:inline">
            {profile.display_name}
          </span>
        )}
        <AccountMenu displayName={profile?.display_name ?? null} email={user?.email ?? ""} />
      </div>
    </header>
  );
}
