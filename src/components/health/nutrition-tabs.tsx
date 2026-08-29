"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutDashboard, Utensils, GlassWater, Target, History, type LucideIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/core/tabs";

const TAB_KEYS = ["overview", "mealsFood", "water", "goals", "history"] as const;
type TabKey = (typeof TAB_KEYS)[number];

const TAB_ICON: Record<TabKey, LucideIcon> = {
  overview: LayoutDashboard,
  mealsFood: Utensils,
  water: GlassWater,
  goals: Target,
  history: History,
};

function isTabKey(value: string | null): value is TabKey {
  return TAB_KEYS.includes(value as TabKey);
}

// Redesign Nutrition spec, Section 1/7: Nutrition stays ONE sidebar
// item — everything below is organized with in-page tabs instead.
// Active tab syncs to ?tab= (same URL-as-state approach as
// DateRangeFilter's ?from=&to=) so refresh/back-forward/bookmarking
// all work, and it composes cleanly with the History tab's own
// from/to params since both just merge into the same URLSearchParams.
export function NutritionTabs({
  overview,
  mealsFood,
  water,
  goals,
  history,
}: {
  overview: React.ReactNode;
  mealsFood: React.ReactNode;
  water: React.ReactNode;
  goals: React.ReactNode;
  history: React.ReactNode;
}) {
  const t = useTranslations("nutrition.tabs");
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

  const content: Record<TabKey, React.ReactNode> = { overview, mealsFood, water, goals, history };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList>
        {TAB_KEYS.map((key) => (
          <TabsTrigger key={key} value={key} icon={TAB_ICON[key]}>
            {t(key)}
          </TabsTrigger>
        ))}
      </TabsList>
      {TAB_KEYS.map((key) => (
        <TabsContent key={key} value={key}>
          {content[key]}
        </TabsContent>
      ))}
    </Tabs>
  );
}
