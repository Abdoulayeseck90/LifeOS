import { getTranslations } from "next-intl/server";
import { ComingSoonPage } from "@/components/core/coming-soon-page";

// No general Finance-wide tax page exists yet (distinct from the Gig
// Driving module's own Taxes tab) -- ComingSoonPage stub, same pattern
// as Prayer.
export const dynamic = "force-dynamic";

export default async function FinanceTaxesPage() {
  const t = await getTranslations("comingSoon");
  return (
    <ComingSoonPage
      title={t("financeTaxes.title")}
      description={t("financeTaxes.description")}
      features={t.raw("financeTaxes.features")}
      badge={t("badge")}
    />
  );
}
