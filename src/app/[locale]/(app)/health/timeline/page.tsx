import { getTranslations } from "next-intl/server";
import { listTimelineEvents } from "@/services/core/timeline";
import type { TimelineEvent } from "@/types/core/entities";
import { classifyTimelineEvent, type TimelineCategory } from "@/lib/core/timeline-categories";
import { TimelineTabs } from "@/components/health/timeline-tabs";
import { TimelineEventList } from "@/components/health/timeline-event-list";

// Per-user data behind auth — never statically prerendered. Read-only
// aggregation; timeline rows are written by domain API routes as a side
// effect of other writes (Spec Section 20), not created here.
//
// Reorganized into an "All" tab plus 5 category tabs (Care Events/
// Medications/Labs & Tests/Vitals & Activity/Documents), same tab
// pattern as Nutrition/Vitals/Exercise/Monitoring, instead of one flat
// unfiltered list.
export const dynamic = "force-dynamic";

export default async function TimelinePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("timeline");
  const events = await listTimelineEvents();

  const byCategory: Record<TimelineCategory, TimelineEvent[]> = {
    care: [],
    medications: [],
    labs: [],
    vitals: [],
    documents: [],
  };
  for (const event of events) {
    byCategory[classifyTimelineEvent(event)].push(event);
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-semibold text-secondary">{t("title")}</h1>

      <TimelineTabs
        all={<TimelineEventList events={events} locale={locale} emptyMessage={t("empty")} />}
        care={<TimelineEventList events={byCategory.care} locale={locale} emptyMessage={t("emptyByCategory.care")} />}
        medications={<TimelineEventList events={byCategory.medications} locale={locale} emptyMessage={t("emptyByCategory.medications")} />}
        labs={<TimelineEventList events={byCategory.labs} locale={locale} emptyMessage={t("emptyByCategory.labs")} />}
        vitals={<TimelineEventList events={byCategory.vitals} locale={locale} emptyMessage={t("emptyByCategory.vitals")} />}
        documents={<TimelineEventList events={byCategory.documents} locale={locale} emptyMessage={t("emptyByCategory.documents")} />}
      />
    </div>
  );
}
