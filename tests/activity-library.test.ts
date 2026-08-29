import { describe, it, expect } from "vitest";
import { groupActivitiesByCategory, filterActivitiesByEquipment, suggestActivitiesForEnvironment, ACTIVITY_CATEGORIES } from "@/lib/health/activity-library";
import type { Activity } from "@/types/health/entities";

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: "id-" + Math.random(),
    name_en: "Test Activity",
    name_fr: "Activité test",
    categories: ["cardio"],
    equipment_needed: ["none"],
    environments: ["anywhere"],
    tags: [],
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("groupActivitiesByCategory", () => {
  it("returns all 5 categories in a fixed order, even when empty", () => {
    const grouped = groupActivitiesByCategory([]);
    expect(grouped.map((g) => g.category)).toEqual(ACTIVITY_CATEGORIES);
    expect(grouped.every((g) => g.activities.length === 0)).toBe(true);
  });

  it("places a multi-category activity into every category it belongs to", () => {
    const walking = activity({ name_en: "Walking", categories: ["cardio", "daily_activity"] });
    const grouped = groupActivitiesByCategory([walking]);
    const cardio = grouped.find((g) => g.category === "cardio")!;
    const daily = grouped.find((g) => g.category === "daily_activity")!;
    expect(cardio.activities).toContain(walking);
    expect(daily.activities).toContain(walking);
  });
});

describe("filterActivitiesByEquipment", () => {
  it("returns everything unfiltered when the user hasn't set any equipment", () => {
    const activities = [activity({ equipment_needed: ["full_gym"] })];
    expect(filterActivitiesByEquipment(activities, [])).toEqual(activities);
  });

  it("always includes no-equipment activities regardless of what the user owns", () => {
    const bodyweight = activity({ name_en: "Bodyweight Training", equipment_needed: ["none"] });
    const barbells = activity({ name_en: "Barbells", equipment_needed: ["full_gym"] });
    const result = filterActivitiesByEquipment([bodyweight, barbells], ["dumbbells"]);
    expect(result).toContain(bodyweight);
    expect(result).not.toContain(barbells);
  });

  it("includes an activity when any of its required equipment matches what the user owns", () => {
    const dumbbells = activity({ name_en: "Dumbbells", equipment_needed: ["dumbbells"] });
    const result = filterActivitiesByEquipment([dumbbells], ["dumbbells", "resistance_bands"]);
    expect(result).toEqual([dumbbells]);
  });
});

describe("suggestActivitiesForEnvironment", () => {
  const bodyweightHome = activity({ name_en: "Bodyweight Training", equipment_needed: ["none"], environments: ["home", "anywhere"] });
  const walking = activity({ name_en: "Walking", equipment_needed: ["none"], environments: ["outdoor", "anywhere"] });
  const gymMachines = activity({ name_en: "Machines", equipment_needed: ["full_gym"], environments: ["gym"] });
  const yoga = activity({ name_en: "Yoga", equipment_needed: ["none"], environments: ["home", "anywhere"], tags: ["low_impact", "small_space_friendly", "limited_mobility_friendly"] });
  const all = [bodyweightHome, walking, gymMachines, yoga];

  it("home_no_equipment suggests no-equipment activities usable at home", () => {
    const result = suggestActivitiesForEnvironment(all, "home_no_equipment");
    expect(result).toContain(bodyweightHome);
    expect(result).toContain(yoga);
    expect(result).not.toContain(gymMachines);
  });

  it("outdoor suggests activities tagged for outdoor environments", () => {
    const result = suggestActivitiesForEnvironment(all, "outdoor");
    expect(result).toEqual([walking]);
  });

  it("gym suggests activities tagged for gym environments", () => {
    const result = suggestActivitiesForEnvironment(all, "gym");
    expect(result).toEqual([gymMachines]);
  });

  it("limited_mobility only suggests activities tagged limited_mobility_friendly", () => {
    const result = suggestActivitiesForEnvironment(all, "limited_mobility");
    expect(result).toEqual([yoga]);
  });

  it("small_space only suggests activities tagged small_space_friendly", () => {
    const result = suggestActivitiesForEnvironment(all, "small_space");
    expect(result).toEqual([yoga]);
  });

  it("flexible returns every activity unfiltered", () => {
    expect(suggestActivitiesForEnvironment(all, "flexible")).toEqual(all);
  });
});
