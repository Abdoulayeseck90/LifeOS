import { getTranslations } from "next-intl/server";
import { ComingSoonPage } from "@/components/core/coming-soon-page";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const t = await getTranslations("comingSoon");
  return (
    <ComingSoonPage
      title={t("assets.title")}
      description={t("assets.description")}
      features={t.raw("assets.features")}
      badge={t("badge")}
    />
  );
}
