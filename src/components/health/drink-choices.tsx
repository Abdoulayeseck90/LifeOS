import { getTranslations } from "next-intl/server";
import { GlassWater } from "lucide-react";
import { ClassificationBadge } from "@/components/health/classification-badge";
import { LiverDetoxWarning } from "@/components/health/liver-detox-warning";
import type { FoodClassification } from "@/lib/health/classification";

// Redesign Nutrition spec, Section 12: ONE "Drink Choices" section
// organized by beverage category (not scattered across the page) —
// supersedes the old DrinkRecommendations/SenegaleseDrinks/
// DrinksToLimit/FruitJuiceNote components, reusing the same
// prioritize/moderation/limit classification as foods (Section 6) so
// the whole Nutrition experience shares one visual vocabulary.
const CATEGORIES: { id: string; drinks: { id: string; classification: FoodClassification }[] }[] = [
  {
    id: "water",
    drinks: [
      { id: "water", classification: "prioritize" },
      { id: "sparklingWater", classification: "prioritize" },
      { id: "lemonWater", classification: "prioritize" },
    ],
  },
  {
    id: "tea",
    drinks: [
      { id: "unsweetenedTea", classification: "prioritize" },
      { id: "sweetenedTea", classification: "limit" },
    ],
  },
  {
    id: "coffee",
    drinks: [
      { id: "unsweetenedCoffee", classification: "prioritize" },
      { id: "sweetenedCoffee", classification: "moderation" },
    ],
  },
  {
    id: "milkAlternatives",
    drinks: [
      { id: "unsweetenedMilk", classification: "prioritize" },
      { id: "sweetenedMilk", classification: "moderation" },
    ],
  },
  {
    id: "fruitDrinks",
    drinks: [
      { id: "wholeFruitInfusedWater", classification: "prioritize" },
      { id: "fruitJuice", classification: "moderation" },
      { id: "sugarSweetenedJuiceDrink", classification: "limit" },
    ],
  },
  {
    id: "traditionalDrinks",
    drinks: [
      { id: "bissapUnsweetened", classification: "prioritize" },
      { id: "gingerDrinkLowSugar", classification: "moderation" },
      { id: "bouyeLowSugar", classification: "moderation" },
      { id: "traditionalDrinkHighSugar", classification: "limit" },
    ],
  },
  {
    id: "sportsEnergy",
    drinks: [{ id: "sportsEnergyDrinks", classification: "limit" }],
  },
];

export async function DrinkChoices() {
  const t = await getTranslations("nutrition.drinkChoices");

  return (
    <section className="mb-8 rounded-card border border-surface bg-white p-4">
      <div className="mb-1 flex items-center gap-2">
        <GlassWater size={18} className="text-muted" />
        <h2 className="text-sm font-semibold text-secondary">{t("title")}</h2>
      </div>
      <p className="mb-4 text-xs text-muted">{t("subtitle")}</p>

      <div className="flex flex-col gap-4">
        {CATEGORIES.map((category) => (
          <div key={category.id}>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{t(`categories.${category.id}`)}</p>
            <div className="flex flex-wrap gap-2">
              {category.drinks.map((drink) => (
                <span key={drink.id} className="inline-flex items-center gap-1.5 rounded-full border border-surface px-2.5 py-1 text-xs text-secondary">
                  {t(`drinks.${drink.id}`)}
                  <ClassificationBadge classification={drink.classification} />
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-muted">{t("fruitJuiceNote")}</p>

      <div className="mt-4">
        <LiverDetoxWarning />
      </div>
    </section>
  );
}
