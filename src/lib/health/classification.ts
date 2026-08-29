import type { MealRating } from "@/types/health/entities";

// Redesign Nutrition spec, Section 6: explicitly NOT a good-food/
// bad-food system. Four tiers, applied consistently across both
// `foods` (new) and `meals` (existing) so the UI never shows two
// different badge vocabularies for the same concept.
export type FoodClassification = "prioritize" | "moderation" | "limit" | "info";
export const FOOD_CLASSIFICATIONS: FoodClassification[] = ["prioritize", "moderation", "limit", "info"];

// `meals.rating` (Section 6 of the earlier Senegal-Focused Nutrition
// spec) predates this new four-tier vocabulary and is left unchanged
// in the database to avoid touching already-seeded meal data — this
// maps it onto the same visual tiers so meal cards and food cards
// read identically. best_choice/good_choice were both always a
// positive framing (never a "the other one is bad" contrast), so both
// map to "prioritize"; consider_modifying maps to "limit" (both mean
// "adapt or reduce this"), matching moderation directly.
export function mealRatingToClassification(rating: MealRating): FoodClassification {
  switch (rating) {
    case "best_choice":
    case "good_choice":
      return "prioritize";
    case "moderation":
      return "moderation";
    case "consider_modifying":
      return "limit";
  }
}
