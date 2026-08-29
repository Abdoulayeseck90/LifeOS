"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutDashboard, ClipboardList } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/core/tabs";

const TAB_KEYS = ["overview", "plans"] as const;
type TabKey = (typeof TAB_KEYS)[number];

function isTabKey(value: string | null): value is TabKey {
  return TAB_KEYS.includes(value as TabKey);
}

// Same tab shell/URL-sync approach as Nutrition/Vitals/Exercise —
// "what needs attention right now" (Overview: overdue/due soon/
// upcoming/recently completed) vs "manage everything" (Plans: the
// full plan/item CRUD list), instead of one long stacked scroll.
export function MonitoringTabs({ overview, plans }: { overview: React.ReactNode; plans: React.ReactNode }) {
  const t = useTranslations("monitoring.tabs");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const requested = searchParams.get("tab");
  const activeTab: TabKey = isTabKey(requested) ? requested : "overview";

  function handleTabChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "overview") params.delete("tab");
    else params.set("tab", next);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList>
        <TabsTrigger value="overview" icon={LayoutDashboard}>
          {t("overview")}
        </TabsTrigger>
        <TabsTrigger value="plans" icon={ClipboardList}>
          {t("plans")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview">{overview}</TabsContent>
      <TabsContent value="plans">{plans}</TabsContent>
    </Tabs>
  );
}
