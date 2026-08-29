"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutDashboard, Stethoscope, Pill, TestTube, Activity, FileText, type LucideIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/core/tabs";

const TAB_KEYS = ["all", "care", "medications", "labs", "vitals", "documents"] as const;
type TabKey = (typeof TAB_KEYS)[number];

const TAB_ICON: Record<TabKey, LucideIcon> = {
  all: LayoutDashboard,
  care: Stethoscope,
  medications: Pill,
  labs: TestTube,
  vitals: Activity,
  documents: FileText,
};

function isTabKey(value: string | null): value is TabKey {
  return TAB_KEYS.includes(value as TabKey);
}

// Same tab shell/URL-sync approach as Nutrition/Vitals/Exercise/
// Monitoring — here splitting the flat cross-domain event feed into
// "All" plus 5 categories (Care Events/Medications/Labs & Tests/
// Vitals & Activity/Documents), grouped by what each event actually
// relates to (src/lib/core/timeline-categories.ts) rather than one tab
// per sidebar sub-page, which would be 9+ tabs and mostly empty for
// most users.
export function TimelineTabs({
  all,
  care,
  medications,
  labs,
  vitals,
  documents,
}: Record<TabKey, React.ReactNode>) {
  const t = useTranslations("timeline.tabs");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const requested = searchParams.get("tab");
  const activeTab: TabKey = isTabKey(requested) ? requested : "all";

  function handleTabChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("tab");
    else params.set("tab", next);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const content: Record<TabKey, React.ReactNode> = { all, care, medications, labs, vitals, documents };

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
