import { describe, it, expect } from "vitest";
import { hasLiverRelatedCondition } from "@/lib/health/liver-guidance";

describe("hasLiverRelatedCondition", () => {
  it("matches liver/hepatitis-related condition names case-insensitively", () => {
    expect(hasLiverRelatedCondition(["Hepatitis B"])).toBe(true);
    expect(hasLiverRelatedCondition(["Fatty Liver Disease"])).toBe(true);
    expect(hasLiverRelatedCondition(["Cirrhosis"])).toBe(true);
  });

  it("returns false for unrelated conditions", () => {
    expect(hasLiverRelatedCondition(["Hypertension"])).toBe(false);
    expect(hasLiverRelatedCondition([])).toBe(false);
  });
});
