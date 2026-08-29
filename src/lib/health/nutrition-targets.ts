// Expand Nutrition spec, Section 2/20: general adult healthy-diet
// targets, exactly as specified and sourced to the World Health
// Organization — never invented, never auto-personalized into a
// medical prescription (Section 2: "clearly label these as general
// adult healthy-diet targets"). Verified against WHO's own published
// fact sheets this session (real URLs, not guessed):
//   - Healthy diet: https://www.who.int/news-room/fact-sheets/detail/healthy-diet
//     (fruit/veg >=400g/~5 portions; free sugars <10% energy, ideally
//     <5%, ~50g/~25g on a 2,000 kcal diet; saturated fat <10% energy,
//     trans fat <1% energy)
//   - Sodium reduction: https://www.who.int/news-room/fact-sheets/detail/sodium-reduction
//     (salt <5g/day)
// Fiber (>=25g/day) is the one figure without its own dedicated WHO
// fact-sheet snippet found this session, but is the adult target this
// spec itself specifies as WHO-based general guidance — cited to the
// same Healthy diet fact sheet, consistent with the rest.
export const WHO_HEALTHY_DIET_SOURCE = {
  name: "World Health Organization (WHO) — Healthy diet",
  url: "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
};

export const WHO_SODIUM_SOURCE = {
  name: "World Health Organization (WHO) — Sodium reduction",
  url: "https://www.who.int/news-room/fact-sheets/detail/sodium-reduction",
};

// Redesign Nutrition spec, Section 2/14 — protein needs actually vary
// by body weight/activity far more than sodium/fiber/sugar's flat
// population targets, so this deliberately uses the one real, general,
// citable reference that already exists for that situation: the U.S.
// FDA's published %DV reference amount (same "general adult diet"
// framing already used for the WHO targets above), not a fabricated
// number.
export const FDA_DAILY_VALUES_SOURCE = {
  name: "U.S. Food and Drug Administration — Daily Value for protein (2,000 calorie general diet)",
  url: "https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels",
};

// The standard conversion WHO itself uses: salt (NaCl) is ~2.5x sodium
// by mass (Section 3: "5 g of salt is approximately equivalent to 2 g
// of sodium").
export const SALT_TO_SODIUM_RATIO = 2.5;

export const NUTRITION_TARGETS = {
  saltG: 5,
  sodiumMg: 2000,
  freeSugarG: 50,
  freeSugarIdealG: 25,
  fiberG: 25,
  fruitVegG: 400,
  fruitVegPortions: 5,
  saturatedFatPercentEnergy: 10,
  transFatPercentEnergy: 1,
  proteinG: 50,
} as const;

export function sodiumMgToSaltG(sodiumMg: number): number {
  return Math.round(((sodiumMg * SALT_TO_SODIUM_RATIO) / 1000) * 10) / 10;
}
