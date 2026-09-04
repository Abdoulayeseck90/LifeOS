import { getTranslations } from "next-intl/server";
import { ComingSoonPage } from "@/components/core/coming-soon-page";

// No spec for Quran yet -- ComingSoonPage stub, same pattern as Prayer.
export const dynamic = "force-dynamic";

export default async function QuranPage() {
  const t = await getTranslations("comingSoon");
  return (
    <ComingSoonPage
      title={t("quran.title")}
      description={t("quran.description")}
      features={t.raw("quran.features")}
      badge={t("badge")}
    />
  );
}
