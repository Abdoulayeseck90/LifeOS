"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutDashboard, Dumbbell, History as HistoryIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/core/tabs";

const TAB_KEYS = ["overview", "library", "history"] as const;
type TabKey = (typeof TAB_KEYS)[number];

function isTabKey(value: string | null): value is TabKey {
  return TAB_KEYS.includes(value as TabKey);
}

// Same tab shell/URL-sync approach as Nutrition/Vitals — "what did I
// do" (Overview: this week's stats + recommendations), "what could I
// do" (Activity Library), "what have I logged" (History), instead of
// one long stacked scroll.
export function ExerciseTabs({
  overview,
  library,
  history,
}: {
  overview: React.ReactNode;
  library: React.ReactNode;
  history: React.ReactNode;
}) {
  const t = useTranslations("exercise.tabs");
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
        <TabsTrigger value="library" icon={Dumbbell}>
          {t("library")}
        </TabsTrigger>
        <TabsTrigger value="history" icon={HistoryIcon}>
          {t("history")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview">{overview}</TabsContent>
      <TabsContent value="library">{library}</TabsContent>
      <TabsContent value="history">{history}</TabsContent>
    </Tabs>
  );
}
