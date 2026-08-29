import { getTranslations } from "next-intl/server";
import { ComingSoonPage } from "@/components/core/coming-soon-page";

export const dynamic = "force-dynamic";

export default async function TravelPage() {
  const t = await getTranslations("comingSoon");
  return (
    <ComingSoonPage
      title={t("travel.title")}
      description={t("travel.description")}
      features={t.raw("travel.features")}
      badge={t("badge")}
    />
  );
}
