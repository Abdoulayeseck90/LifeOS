import { getTranslations } from "next-intl/server";
import { ComingSoonPage } from "@/components/core/coming-soon-page";

// Faith-specific goals (distinct from the general Planning /goals) --
// no spec yet, ComingSoonPage stub, same pattern as Prayer.
export const dynamic = "force-dynamic";

export default async function FaithGoalsPage() {
  const t = await getTranslations("comingSoon");
  return (
    <ComingSoonPage
      title={t("faithGoals.title")}
      description={t("faithGoals.description")}
      features={t.raw("faithGoals.features")}
      badge={t("badge")}
    />
  );
}
