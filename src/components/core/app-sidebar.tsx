"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { SidebarNavContent } from "@/components/core/sidebar-nav-content";
import { Logo } from "@/components/core/logo";

const COLLAPSE_STORAGE_KEY = "lifeos:sidebar-collapsed";

// Desktop/tablet persistent sidebar (Master Redesign Section 4/9) —
// visible from md up, dark navy per the platform visual reference.
// Phones get the same nav tree via MobileSidebarDrawer's hamburger +
// slide-in drawer instead (light theme there, since it's hosted inside
// the white Modal). Collapse state persists across visits via
// localStorage — a client component only for that reason.
export function AppSidebar() {
  const t = useTranslations("nav");
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === "true");
    setHydrated(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next));
      return next;
    });
  }

  // Render expanded on the very first paint (server + pre-hydration
  // client both agree on this), then apply the real stored preference
  // right after mount — avoids a hydration mismatch from reading
  // localStorage during render.
  const effectiveCollapsed = hydrated && collapsed;

  return (
    <aside
      className={`hidden shrink-0 flex-col border-r border-secondary bg-secondary p-3 transition-[width] duration-150 md:flex ${
        effectiveCollapsed ? "w-16" : "w-56 lg:w-64 lg:p-4"
      }`}
    >
      <div className={`mb-6 flex items-center px-1 ${effectiveCollapsed ? "justify-center" : "justify-between"}`}>
        <Link href="/dashboard">
          <Logo onDark withWordmark={!effectiveCollapsed} />
        </Link>
        {!effectiveCollapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={t("collapseSidebar")}
            className="rounded p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
          >
            <PanelLeftClose size={18} />
          </button>
        )}
      </div>

      <SidebarNavContent theme="dark" collapsed={effectiveCollapsed} />

      {effectiveCollapsed && (
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={t("expandSidebar")}
          className="mt-auto flex items-center justify-center rounded p-2 text-white/60 hover:bg-white/10 hover:text-white"
        >
          <PanelLeftOpen size={18} />
        </button>
      )}
    </aside>
  );
}
