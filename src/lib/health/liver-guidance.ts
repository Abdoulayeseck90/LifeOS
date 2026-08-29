// Redesign Nutrition spec, Section 7: "If the user has a condition
// where relevant, show 'Liver-conscious eating.'" A conservative
// substring heuristic over self-reported condition names, not a
// diagnosis — same pattern as hasFluidRestrictionCondition in
// lib/health/hydration.ts.
const LIVER_RELATED_KEYWORDS = ["liver", "hepat", "cirrho", "fatty liver", "nash", "nafld"];

export function hasLiverRelatedCondition(conditionNames: string[]): boolean {
  return conditionNames.some((name) => {
    const lower = name.toLowerCase();
    return LIVER_RELATED_KEYWORDS.some((keyword) => lower.includes(keyword));
  });
}
