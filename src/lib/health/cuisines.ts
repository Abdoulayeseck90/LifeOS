// Redesign Nutrition spec, Section 3/10/17: the canonical cuisine list
// lives in exactly one place — no component hard-codes its own copy.
// The database column (meals.cuisine, foods.cuisine) is plain text
// (no CHECK constraint), so adding a new cuisine later is just adding
// an entry here plus a locale key, never a migration. "all" is a UI-only
// filter value, never stored on a row.
export const CUISINE_FILTER_OPTIONS = [
  "all",
  "senegalese_west_african",
  "american",
  "mexican",
  "italian",
  "indian",
  "japanese",
  "north_african",
  "other",
] as const;

export type CuisineFilterOption = (typeof CUISINE_FILTER_OPTIONS)[number];
export type Cuisine = Exclude<CuisineFilterOption, "all">;

export const CUISINE_OPTIONS: Cuisine[] = CUISINE_FILTER_OPTIONS.filter((c): c is Cuisine => c !== "all");

// Flags are used here as cuisine/region indicators (spec's own Section
// 3 examples write them this way), distinct from the Section 20
// instruction to use Lucide icons rather than emoji for UI action/
// category icons elsewhere on the page.
export const CUISINE_FLAG: Record<Cuisine, string> = {
  senegalese_west_african: "🇸🇳",
  american: "🇺🇸",
  mexican: "🇲🇽",
  italian: "🇮🇹",
  indian: "🇮🇳",
  japanese: "🇯🇵",
  north_african: "🇲🇦",
  other: "🌍",
};
