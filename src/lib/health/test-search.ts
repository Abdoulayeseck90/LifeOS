import type { LabCategory, TestDefinition } from "@/types/health/entities";

// Expand Lab Test Selection spec, Section 1/16: search matches name
// (either language), abbreviation/code, and description ("common
// name") — case-insensitive substring match, instant (no debounce
// needed at this catalog size). Pure/client-safe.
export function searchTestDefinitions(tests: TestDefinition[], query: string): TestDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return tests;

  return tests.filter((test) => {
    return (
      test.name_en.toLowerCase().includes(q) ||
      test.name_fr.toLowerCase().includes(q) ||
      (test.code?.toLowerCase().includes(q) ?? false) ||
      (test.description?.toLowerCase().includes(q) ?? false)
    );
  });
}

// Section 1's example groups results by category — preserves a stable,
// clinically-sensible category order rather than alphabetical, and
// keeps categories with zero matches out of the result entirely.
export const CATEGORY_ORDER: LabCategory[] = [
  "hepatitis_b",
  "liver",
  "kidney_renal",
  "blood_cbc",
  "metabolic",
  "thyroid",
  "iron_nutrition",
  "inflammation_immune",
  "pancreas",
  "cardiovascular",
  "other",
];

export function groupTestsByCategory(tests: TestDefinition[]): { category: LabCategory; tests: TestDefinition[] }[] {
  const groups = new Map<LabCategory, TestDefinition[]>();
  for (const test of tests) {
    const existing = groups.get(test.category);
    if (existing) existing.push(test);
    else groups.set(test.category, [test]);
  }

  return CATEGORY_ORDER.filter((category) => groups.has(category)).map((category) => ({
    category,
    tests: groups.get(category) as TestDefinition[],
  }));
}
