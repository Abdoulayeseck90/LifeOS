import { describe, it, expect } from "vitest";
import { mealRatingToClassification } from "@/lib/health/classification";

describe("mealRatingToClassification", () => {
  it("maps both positive meal ratings to prioritize", () => {
    expect(mealRatingToClassification("best_choice")).toBe("prioritize");
    expect(mealRatingToClassification("good_choice")).toBe("prioritize");
  });

  it("maps moderation directly to moderation", () => {
    expect(mealRatingToClassification("moderation")).toBe("moderation");
  });

  it("maps consider_modifying to limit", () => {
    expect(mealRatingToClassification("consider_modifying")).toBe("limit");
  });
});
