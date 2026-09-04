"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  CalendarClock,
  Clock,
  DollarSign,
  Route,
  Receipt,
  Car,
  FileText,
  BarChart3,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/core/tabs";

const TAB_KEYS = ["overview", "schedule", "shifts", "earnings", "mileage", "expenses", "vehicle", "taxes", "analytics"] as const;
type TabKey = (typeof TAB_KEYS)[number];

function isTabKey(value: string | null): value is TabKey {
  return TAB_KEYS.includes(value as TabKey);
}

// Same tab shell/URL-sync approach as Monitoring/Nutrition/Vitals —
// nine tabs, all data fetched server-side and passed in as render
// props, so this component only owns which panel is visible.
export function GigDrivingTabs({
  overview,
  schedule,
  shifts,
  earnings,
  mileage,
  expenses,
  vehicle,
  taxes,
  analytics,
}: Record<TabKey, React.ReactNode>) {
  const t = useTranslations("gigDriving.tabs");
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
        <TabsTrigger value="schedule" icon={CalendarClock}>
          {t("schedule")}
        </TabsTrigger>
        <TabsTrigger value="shifts" icon={Clock}>
          {t("shifts")}
        </TabsTrigger>
        <TabsTrigger value="earnings" icon={DollarSign}>
          {t("earnings")}
        </TabsTrigger>
        <TabsTrigger value="mileage" icon={Route}>
          {t("mileage")}
        </TabsTrigger>
        <TabsTrigger value="expenses" icon={Receipt}>
          {t("expenses")}
        </TabsTrigger>
        <TabsTrigger value="vehicle" icon={Car}>
          {t("vehicle")}
        </TabsTrigger>
        <TabsTrigger value="taxes" icon={FileText}>
          {t("taxes")}
        </TabsTrigger>
        <TabsTrigger value="analytics" icon={BarChart3}>
          {t("analytics")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview">{overview}</TabsContent>
      <TabsContent value="schedule">{schedule}</TabsContent>
      <TabsContent value="shifts">{shifts}</TabsContent>
      <TabsContent value="earnings">{earnings}</TabsContent>
      <TabsContent value="mileage">{mileage}</TabsContent>
      <TabsContent value="expenses">{expenses}</TabsContent>
      <TabsContent value="vehicle">{vehicle}</TabsContent>
      <TabsContent value="taxes">{taxes}</TabsContent>
      <TabsContent value="analytics">{analytics}</TabsContent>
    </Tabs>
  );
}
