"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { FolderKanban, Target, CheckSquare, Wallet, StickyNote, History as HistoryIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/core/tabs";

const TAB_KEYS = ["projects", "goals", "tasks", "finances", "notes", "activity"] as const;
type TabKey = (typeof TAB_KEYS)[number];

const TAB_ICON = {
  projects: FolderKanban,
  goals: Target,
  tasks: CheckSquare,
  finances: Wallet,
  notes: StickyNote,
  activity: HistoryIcon,
} as const;

function isTabKey(value: string | null): value is TabKey {
  return TAB_KEYS.includes(value as TabKey);
}

// Planning & Business spec, Section 12: a Business's Projects/Goals/
// Tasks/Finances/Notes are all the SAME underlying lists filtered by
// business_id — tabs here are purely a presentation choice, same
// ?tab= URL-sync pattern as Nutrition/Vitals/Exercise/Monitoring/
// Timeline this session.
export function BusinessTabs(props: Record<TabKey, React.ReactNode>) {
  const t = useTranslations("planning.businessDetail.tabs");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const requested = searchParams.get("tab");
  const activeTab: TabKey = isTabKey(requested) ? requested : "projects";

  function handleTabChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "projects") params.delete("tab");
    else params.set("tab", next);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

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
          {props[key]}
        </TabsContent>
      ))}
    </Tabs>
  );
}
