"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutDashboard, History as HistoryIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/core/tabs";

const TAB_KEYS = ["overview", "history"] as const;
type TabKey = (typeof TAB_KEYS)[number];

function isTabKey(value: string | null): value is TabKey {
  return TAB_KEYS.includes(value as TabKey);
}

// Same tab shell/URL-sync approach as Nutrition's NutritionTabs — splits
// the page into "what's my status right now" (Overview: latest readings
// + trend charts) vs "the full filterable log" (History: date-ranged
// unified + per-type lists), instead of one long stacked scroll. Every
// "View history" link elsewhere on the page (VitalLatestCard,
// BloodPressureSummary, BodyMetricLatestCard) now just points at
// ?tab=history rather than an in-page anchor, since Radix Tabs doesn't
// keep inactive panels in the DOM for an anchor to land on.
export function VitalsTabs({ overview, history }: { overview: React.ReactNode; history: React.ReactNode }) {
  const t = useTranslations("vitals.tabs");
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
        <TabsTrigger value="history" icon={HistoryIcon}>
          {t("history")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview">{overview}</TabsContent>
      <TabsContent value="history">{history}</TabsContent>
    </Tabs>
  );
}
