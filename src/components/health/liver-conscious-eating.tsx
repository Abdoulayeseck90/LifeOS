import { getTranslations } from "next-intl/server";
import { HeartPulse } from "lucide-react";

// Expand Nutrition spec, Section 9/25 — the load-bearing safety
// section of this whole feature. Every sentence here was checked
// against the explicit prohibition list: no claim that any food or
// diet treats, cures, prevents, "cleans," "detoxes," or "kills" HBV.
// General healthy-eating information only, explicitly labeled as such,
// explicitly not a substitute for a clinician or registered dietitian.
export async function LiverConsciousEating() {
  const t = await getTranslations("nutrition.liverConscious");

  const focusItems = [
    "vegetables",
    "fruits",
    "legumes",
    "wholeGrains",
    "nuts",
    "fish",
    "leanProtein",
    "unsaturatedFats",
  ] as const;
  const limitItems = ["processedFoods", "excessSugar", "excessSodium", "excessAlcohol"] as const;

  return (
    <section className="rounded-card border border-surface bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <HeartPulse size={18} className="text-muted" />
        <h3 className="text-sm font-semibold text-secondary">{t("title")}</h3>
      </div>

      <p className="mt-2 text-sm text-muted">{t("disclaimer")}</p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("focusOn")}</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm text-secondary">
            {focusItems.map((item) => (
              <li key={item}>• {t(`focusItems.${item}`)}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("limit")}</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm text-secondary">
            {limitItems.map((item) => (
              <li key={item}>• {t(`limitItems.${item}`)}</li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted">{t("notMedicalAdvice")}</p>
    </section>
  );
}
