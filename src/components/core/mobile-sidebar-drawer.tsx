"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/core/modal";
import { SidebarNavContent } from "@/components/core/sidebar-nav-content";
import { Menu } from "lucide-react";

// Phone navigation entry point (Master Redesign Section 8, revised to
// the standard responsive-web-dashboard pattern rather than a native
// bottom tab bar): a hamburger button in the header opens the same nav
// tree AppSidebar shows on tablet/desktop, as a left-anchored overlay
// drawer. Visible below md only — AppSidebar takes over from md up.
export function MobileSidebarDrawer() {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("menu")}
        className="flex h-10 w-10 items-center justify-center rounded-full text-secondary hover:bg-surface md:hidden"
      >
        <Menu size={22} />
      </button>

      <Modal open={open} onOpenChange={setOpen} title="LifeOS" variant="drawer" side="left">
        <SidebarNavContent onNavigate={() => setOpen(false)} theme="light" />
      </Modal>
    </>
  );
}
