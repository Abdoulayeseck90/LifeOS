import { getTranslations } from "next-intl/server";
import { ComingSoonPage } from "@/components/core/coming-soon-page";

// Navigation restructure: Faith is a first-class sidebar module with its
// own Overview entry. Prayer/Dua already have real pages; this overview
// itself has no spec yet, same ComingSoonPage treatment as Prayer.
export const dynamic = "force-dynamic";

export default async function FaithOverviewPage() {
  const t = await getTranslations("comingSoon");
  return (
    <ComingSoonPage
      title={t("faithOverview.title")}
      description={t("faithOverview.description")}
      features={t.raw("faithOverview.features")}
      badge={t("badge")}
    />
  );
}
