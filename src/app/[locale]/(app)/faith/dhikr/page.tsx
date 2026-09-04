import { getTranslations } from "next-intl/server";
import { ComingSoonPage } from "@/components/core/coming-soon-page";

// No spec for Dhikr yet -- ComingSoonPage stub, same pattern as Prayer.
export const dynamic = "force-dynamic";

export default async function DhikrPage() {
  const t = await getTranslations("comingSoon");
  return (
    <ComingSoonPage
      title={t("dhikr.title")}
      description={t("dhikr.description")}
      features={t.raw("dhikr.features")}
      badge={t("badge")}
    />
  );
}
