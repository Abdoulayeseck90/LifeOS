import { getTranslations } from "next-intl/server";
import { Wine } from "lucide-react";

// Expand Nutrition spec, Section 10: visible, but deliberately does
// NOT state a "safe amount" for hepatitis B specifically (no
// appropriate clinical source was given for one) and avoids fear-based
// language — the one instruction is to talk to a clinician.
export async function AlcoholLiverCard() {
  const t = await getTranslations("nutrition.alcohol");

  return (
    <div className="rounded-card border border-surface bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <Wine size={18} className="text-muted" />
        <h3 className="text-sm font-semibold text-secondary">{t("title")}</h3>
      </div>
      <p className="mt-2 text-sm text-secondary">{t("body")}</p>
      <p className="mt-2 text-sm text-muted">{t("recommendation")}</p>
    </div>
  );
}
