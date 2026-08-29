import { getTranslations } from "next-intl/server";
import { ComingSoonPage } from "@/components/core/coming-soon-page";

// No spec for Prayer yet — only Dua is being built this pass. Section
// 15 explicitly says the Dua system should be "architecturally ready"
// to integrate with Prayer later, not that Prayer itself ships now.
export const dynamic = "force-dynamic";

export default async function PrayerPage() {
  const t = await getTranslations("comingSoon");
  return (
    <ComingSoonPage
      title={t("prayer.title")}
      description={t("prayer.description")}
      features={t.raw("prayer.features")}
      badge={t("badge")}
    />
  );
}
