"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/navigation";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  Home,
  HeartPulse,
  Activity,
  LayoutDashboard,
  TestTube,
  ScanLine,
  Pill,
  CalendarDays,
  Stethoscope,
  Dumbbell,
  Apple,
  MonitorCheck,
  FileText,
  ClipboardList,
  FolderKanban,
  Target,
  ListChecks,
  BriefcaseBusiness,
  Wallet,
  TrendingUp,
  TrendingDown,
  ReceiptText,
  RefreshCw,
  CreditCard,
  NotebookPen,
  Files,
  Landmark,
  HandHeart,
  Settings as SettingsIcon,
  ChevronDown,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

// Navigation & IA Redesign, updated by the Calendar spec: Dashboard,
// a collapsible Planning group (Projects/Goals/Tasks/Business), a
// standalone Calendar link (Appointments moved out of Health and into
// Calendar, which is now the one place appointments are managed — see
// health/appointments/page.tsx, now just a redirect), a collapsible
// Health group, then Finance, Faith, flat Notes/Documents, then
// Settings — exactly one Calendar entry in this sidebar (the Header's
// own separate CalendarDays quick-link is untouched, pre-existing, and
// out of scope here). Sign Out is deliberately not here — it lives only
// in Settings -> Account, so it isn't duplicated across the app. Health
// Timeline is likewise not a sidebar destination (its recent-activity
// role moved into Health Overview) — the page itself still exists and
// works, just isn't linked from here.
// Shared between the desktop/tablet AppSidebar (dark navy theme) and the
// phone hamburger drawer (MobileSidebarDrawer, hosted inside the white
// Modal — light theme) — one source of truth for the nav tree, themed
// per caller via the `theme` prop.
export const HEALTH_ITEMS: { href: string; key: string; icon: LucideIcon }[] = [
  { href: "/health", key: "overview", icon: LayoutDashboard },
  { href: "/health/conditions", key: "conditions", icon: HeartPulse },
  { href: "/health/vitals", key: "vitals", icon: Activity },
  { href: "/health/labs", key: "labResults", icon: TestTube },
  { href: "/health/diagnostic-tests", key: "diagnosticTests", icon: ScanLine },
  { href: "/health/medications", key: "medications", icon: Pill },
  { href: "/health/symptoms", key: "symptoms", icon: Stethoscope },
  { href: "/health/exercise", key: "exercise", icon: Dumbbell },
  { href: "/health/nutrition", key: "nutrition", icon: Apple },
  { href: "/health/monitoring", key: "monitoring", icon: MonitorCheck },
  { href: "/health/documents", key: "documents", icon: FileText },
];

// Projects/Business already exist as ComingSoonPage stubs; Goals/Tasks
// get matching new stubs (src/app/[locale]/(app)/goals|tasks/page.tsx)
// so these links resolve to something real rather than 404ing.
export const PLANNING_ITEMS: { href: string; key: string; icon: LucideIcon }[] = [
  { href: "/projects", key: "projects", icon: FolderKanban },
  { href: "/goals", key: "goals", icon: Target },
  { href: "/tasks", key: "tasks", icon: ListChecks },
  { href: "/business", key: "business", icon: BriefcaseBusiness },
];

// Credit & Loans/Bills/Subscriptions all live inside Finance, never as
// top-level sidebar items. There is no Budget section in this version
// of LifeOS. Receipts is NOT a Finance page — it's a document_type
// inside the top-level Documents module (see FLAT_MODULES below).
export const FINANCE_ITEMS: { href: string; key: string; icon: LucideIcon }[] = [
  { href: "/finance", key: "financeOverview", icon: Wallet },
  { href: "/finance/income", key: "income", icon: TrendingUp },
  { href: "/finance/expenses", key: "expenses", icon: TrendingDown },
  { href: "/finance/bills", key: "bills", icon: ReceiptText },
  { href: "/finance/subscriptions", key: "subscriptions", icon: RefreshCw },
  { href: "/finance/credit-and-loans", key: "creditAndLoans", icon: CreditCard },
];

// Faith spec, Section 1: Dua must be inside Faith, never a top-level
// item on its own — Prayer has no spec yet and is a ComingSoonPage stub.
export const FAITH_ITEMS: { href: string; key: string; icon: LucideIcon }[] = [
  { href: "/faith/prayer", key: "prayer", icon: Landmark },
  { href: "/faith/dua", key: "dua", icon: HandHeart },
];

// Travel/Assets are intentionally not linked from the sidebar (Health-
// first IA — see Navigation & IA Redesign) — their pages still exist,
// just unreferenced here, same treatment as Health Timeline. Documents
// (personal files/receipts/certificates/etc.) is a separate top-level
// module from Notes and from Health's Medical Documents.
// key "personalDocuments" (not "documents") deliberately avoids colliding
// with nav.documents, which already means Health's Medical Documents.
export const FLAT_MODULES: { href: string; key: string; icon: LucideIcon }[] = [
  { href: "/notes", key: "notes", icon: NotebookPen },
  { href: "/documents", key: "personalDocuments", icon: Files },
];

type Theme = "dark" | "light";

const THEME_CLASSES: Record<Theme, { active: string; inactive: string }> = {
  dark: {
    active: "bg-primary text-primary-foreground",
    inactive: "text-white/70 hover:bg-white/10 hover:text-white",
  },
  light: {
    active: "bg-primary/10 font-medium text-primary",
    inactive: "text-muted hover:bg-white hover:text-primary",
  },
};

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
  theme,
  collapsed,
  className,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onNavigate?: () => void;
  theme: Theme;
  collapsed?: boolean;
  className?: string;
}) {
  const link = (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      className={`flex items-center gap-2.5 rounded px-3 py-2 text-sm transition-colors ${
        collapsed ? "justify-center px-2" : ""
      } ${active ? THEME_CLASSES[theme].active : THEME_CLASSES[theme].inactive} ${className ?? ""}`}
    >
      <Icon size={18} className="shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{link}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={8}
          className="z-50 rounded border border-surface bg-secondary px-2 py-1 text-xs text-white shadow-lg"
        >
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

// Shared collapsible-group pattern (Health, Planning) — a toggle button
// that expands/collapses its own indented submenu, or (when the whole
// sidebar is icon-only) a single NavLink to `collapsedHref`.
function CollapsibleNavGroup({
  id,
  label,
  icon: Icon,
  items,
  collapsedHref,
  active,
  onNavigate,
  theme,
  collapsed,
}: {
  id: string;
  label: string;
  icon: LucideIcon;
  items: { href: string; key: string; icon: LucideIcon }[];
  collapsedHref: string;
  active: boolean;
  onNavigate?: () => void;
  theme: Theme;
  collapsed?: boolean;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(active);
  const colors = THEME_CLASSES[theme];

  if (collapsed) {
    return <NavLink href={collapsedHref} label={label} icon={Icon} active={active} onNavigate={onNavigate} theme={theme} collapsed />;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        className={`flex items-center gap-2.5 rounded px-3 py-2 text-sm transition-colors ${
          active ? "font-medium " + (theme === "dark" ? "text-white" : "text-primary") : colors.inactive
        }`}
      >
        <Icon size={18} className="shrink-0" />
        <span className="flex-1 truncate text-left">{label}</span>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {open && (
        <div id={id} className={`ml-3 flex flex-col gap-1 border-l pl-3 ${theme === "dark" ? "border-white/10" : "border-surface"}`}>
          {items.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={t(item.key)}
              icon={item.icon}
              active={pathname === item.href}
              onNavigate={onNavigate}
              theme={theme}
            />
          ))}
        </div>
      )}
    </>
  );
}

export function SidebarNavContent({
  onNavigate,
  theme = "dark",
  collapsed = false,
}: {
  onNavigate?: () => void;
  theme?: Theme;
  collapsed?: boolean;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const healthActive = pathname === "/health" || pathname.startsWith("/health/");
  const planningActive = PLANNING_ITEMS.some((item) => pathname === item.href);
  const financeActive = pathname === "/finance" || pathname.startsWith("/finance/");
  const faithActive = pathname.startsWith("/faith/");

  return (
    <Tooltip.Provider delayDuration={200}>
      <nav className="flex flex-col gap-1">
        <NavLink
          href="/dashboard"
          label={t("dashboard")}
          icon={Home}
          active={pathname === "/dashboard"}
          onNavigate={onNavigate}
          theme={theme}
          collapsed={collapsed}
        />

        <CollapsibleNavGroup
          id="sidebar-planning-submenu"
          label={t("planning")}
          icon={ClipboardList}
          items={PLANNING_ITEMS}
          collapsedHref="/projects"
          active={planningActive}
          onNavigate={onNavigate}
          theme={theme}
          collapsed={collapsed}
        />

        <NavLink
          href="/calendar"
          label={t("calendar")}
          icon={CalendarDays}
          active={pathname === "/calendar"}
          onNavigate={onNavigate}
          theme={theme}
          collapsed={collapsed}
        />

        <CollapsibleNavGroup
          id="sidebar-health-submenu"
          label={t("health")}
          icon={HeartPulse}
          items={HEALTH_ITEMS}
          collapsedHref="/health"
          active={healthActive}
          onNavigate={onNavigate}
          theme={theme}
          collapsed={collapsed}
        />

        <CollapsibleNavGroup
          id="sidebar-finance-submenu"
          label={t("finance")}
          icon={Wallet}
          items={FINANCE_ITEMS}
          collapsedHref="/finance"
          active={financeActive}
          onNavigate={onNavigate}
          theme={theme}
          collapsed={collapsed}
        />

        <CollapsibleNavGroup
          id="sidebar-faith-submenu"
          label={t("faith")}
          icon={Landmark}
          items={FAITH_ITEMS}
          collapsedHref="/faith/dua"
          active={faithActive}
          onNavigate={onNavigate}
          theme={theme}
          collapsed={collapsed}
        />

        {FLAT_MODULES.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={t(item.key)}
            icon={item.icon}
            active={pathname === item.href}
            onNavigate={onNavigate}
            theme={theme}
            collapsed={collapsed}
          />
        ))}

        <div className={`my-2 h-px ${theme === "dark" ? "bg-white/10" : "bg-surface"}`} />

        <NavLink
          href="/settings"
          label={t("settings")}
          icon={SettingsIcon}
          active={pathname === "/settings"}
          onNavigate={onNavigate}
          theme={theme}
          collapsed={collapsed}
        />
      </nav>
    </Tooltip.Provider>
  );
}
