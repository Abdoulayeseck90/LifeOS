import { getTranslations } from "next-intl/server";
import { ComingSoonPage } from "@/components/core/coming-soon-page";

// No spec for Donations/Charity yet -- ComingSoonPage stub, same pattern
// as Prayer.
export const dynamic = "force-dynamic";

export default async function DonationsPage() {
  const t = await getTranslations("comingSoon");
  return (
    <ComingSoonPage
      title={t("donations.title")}
      description={t("donations.description")}
      features={t.raw("donations.features")}
      badge={t("badge")}
    />
  );
}
