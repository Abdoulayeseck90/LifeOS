import { getTranslations } from "next-intl/server";
import { HeartPulse } from "lucide-react";

// Senegal-Focused Liver-Conscious Nutrition spec, Section 18/24 —
// exact careful wording, clearly distinguishing general nutrition
// guidance from medical information. Distinct from LiverConsciousEating
// (the "focus on / limit" principles list): this section specifically
// addresses hepatitis B and the fact that nutritional needs aren't
// one-size-fits-all (Section 25).
export async function HepatitisBNutrition() {
  const t = await getTranslations("nutrition.hepatitisB");

  return (
    <section className="rounded-card border border-surface bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <HeartPulse size={18} className="text-muted" />
        <h3 className="text-sm font-semibold text-secondary">{t("title")}</h3>
      </div>
      <p className="text-sm text-secondary">{t("intro")}</p>
      <p className="mt-2 text-sm text-secondary">{t("focus")}</p>
      <p className="mt-3 text-xs text-muted">{t("individualizedAdvice")}</p>
    </section>
  );
}
