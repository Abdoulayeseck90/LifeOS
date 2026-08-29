import { getTranslations } from "next-intl/server";
import { Info } from "lucide-react";
import { WHO_HEALTHY_DIET_SOURCE, WHO_SODIUM_SOURCE } from "@/lib/health/nutrition-targets";

// Expand Nutrition spec, Section 20: source attribution for every
// target shown on this page, real fetchable URLs (verified against
// WHO's own published fact sheets this session), never invented.
export async function NutritionSources() {
  const t = await getTranslations("nutrition.sources");

  const citedTargets = [
    { key: "salt", source: WHO_SODIUM_SOURCE },
    { key: "sodium", source: WHO_SODIUM_SOURCE },
    { key: "freeSugar", source: WHO_HEALTHY_DIET_SOURCE },
    { key: "fiber", source: WHO_HEALTHY_DIET_SOURCE },
    { key: "fruitVeg", source: WHO_HEALTHY_DIET_SOURCE },
    { key: "fat", source: WHO_HEALTHY_DIET_SOURCE },
  ] as const;

  return (
    <div className="rounded-card border border-surface bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <Info size={18} className="text-muted" />
        <h3 className="text-sm font-semibold text-secondary">{t("title")}</h3>
      </div>
      <ul className="mt-2 flex flex-col gap-1.5 text-sm">
        {citedTargets.map(({ key, source }) => (
          <li key={key} className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-secondary">{t(`targets.${key}`)}</span>
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
              {source.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
