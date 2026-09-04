import { getTranslations } from "next-intl/server";
import { ComingSoonPage } from "@/components/core/coming-soon-page";

// No spec for Reflections yet -- ComingSoonPage stub, same pattern as
// Prayer.
export const dynamic = "force-dynamic";

export default async function ReflectionsPage() {
  const t = await getTranslations("comingSoon");
  return (
    <ComingSoonPage
      title={t("reflections.title")}
      description={t("reflections.description")}
      features={t.raw("reflections.features")}
      badge={t("badge")}
    />
  );
}
