import { describe, it, expect } from "vitest";
import { searchTestDefinitions, groupTestsByCategory } from "@/lib/health/test-search";
import type { TestDefinition } from "@/types/health/entities";

function test(overrides: Partial<TestDefinition> = {}): TestDefinition {
  return {
    id: "id-" + Math.random(),
    name_en: "Alanine Aminotransferase",
    name_fr: "Alanine aminotransférase",
    code: "ALT",
    category: "liver",
    default_unit: "U/L",
    description: null,
    active: true,
    is_custom: false,
    user_id: null,
    created_at: "2026-08-27T00:00:00Z",
    updated_at: "2026-08-27T00:00:00Z",
    ...overrides,
  };
}

const AST = test({ id: "ast", name_en: "AST", name_fr: "ASAT", code: "AST", category: "liver" });
const ALT = test({ id: "alt", name_en: "Alanine Aminotransferase", name_fr: "Alanine aminotransférase", code: "ALT", category: "liver" });
const CREATININE = test({ id: "creat", name_en: "Creatinine", name_fr: "Créatinine", code: "CREAT", category: "kidney_renal" });
const HBV_DNA = test({ id: "hbv", name_en: "HBV DNA", name_fr: "ADN du VHB", code: "HBV-DNA", category: "hepatitis_b" });

const TESTS = [AST, ALT, CREATININE, HBV_DNA];

describe("searchTestDefinitions", () => {
  it("returns everything when the query is empty", () => {
    expect(searchTestDefinitions(TESTS, "")).toHaveLength(4);
  });

  it("matches by code (Section 16: 'alan' example)", () => {
    const results = searchTestDefinitions(TESTS, "alan");
    expect(results).toEqual([ALT]);
  });

  it("matches by English name substring ('creat' example)", () => {
    const results = searchTestDefinitions(TESTS, "creat");
    expect(results).toEqual([CREATININE]);
  });

  it("matches by exact code case-insensitively ('hbv' example)", () => {
    const results = searchTestDefinitions(TESTS, "hbv");
    expect(results).toEqual([HBV_DNA]);
  });

  it("matches by French name", () => {
    const results = searchTestDefinitions(TESTS, "asat");
    expect(results).toEqual([AST]);
  });

  it("returns nothing for a query that matches no test", () => {
    expect(searchTestDefinitions(TESTS, "ceruloplasmin")).toEqual([]);
  });
});

describe("groupTestsByCategory", () => {
  it("groups matches under their category in the established clinical order", () => {
    const groups = groupTestsByCategory(TESTS);
    expect(groups.map((g) => g.category)).toEqual(["hepatitis_b", "liver", "kidney_renal"]);
    expect(groups.find((g) => g.category === "liver")?.tests).toEqual([AST, ALT]);
  });

  it("omits categories with zero results", () => {
    const groups = groupTestsByCategory([CREATININE]);
    expect(groups).toEqual([{ category: "kidney_renal", tests: [CREATININE] }]);
  });

  it("returns an empty array for no tests", () => {
    expect(groupTestsByCategory([])).toEqual([]);
  });
});
