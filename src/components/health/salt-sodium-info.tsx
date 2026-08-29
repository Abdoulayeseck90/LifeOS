import { getTranslations } from "next-intl/server";
import { Droplets } from "lucide-react";
import { NUTRITION_TARGETS, SALT_TO_SODIUM_RATIO, WHO_SODIUM_SOURCE } from "@/lib/health/nutrition-targets";

// Expand Nutrition spec, Section 3: "Make the distinction extremely
// clear... do NOT display 'Sodium <5 g/day.'" Salt and sodium are
// shown as two separate labeled numbers with the conversion spelled
// out, plus where sodium actually comes from (not just table salt).
export async function SaltSodiumInfo() {
  const t = await getTranslations("nutrition.saltSodium");

  return (
    <div className="rounded-card border border-surface bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <Droplets size={18} className="text-muted" />
        <h3 className="text-sm font-semibold text-secondary">{t("title")}</h3>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("salt")}</p>
          <p className="text-lg font-semibold text-secondary">&lt;{NUTRITION_TARGETS.saltG} g/day</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("sodium")}</p>
          <p className="text-lg font-semibold text-secondary">&lt;{NUTRITION_TARGETS.sodiumMg / 1000} g/day</p>
        </div>
      </div>

      <p className="mt-3 text-sm text-muted">{t("conversionNote", { ratio: SALT_TO_SODIUM_RATIO })}</p>
      <p className="mt-2 text-sm text-muted">{t("sourcesNote")}</p>
      <p className="mt-3 text-xs text-muted">
        {t("source")}: {WHO_SODIUM_SOURCE.name}
      </p>
    </div>
  );
}
