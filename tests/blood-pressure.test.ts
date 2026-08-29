import { describe, it, expect } from "vitest";
import { getBloodPressureStatus } from "@/lib/health/blood-pressure";

// getBloodPressureStatus is pure and deliberately NOT a clinical
// classifier — see the comment on the function. It only compares a
// reading to the user's own recent average (personal baseline), never a
// fixed population threshold, per the Vitals spec's explicit
// "never diagnose from a reading" requirement.
describe("getBloodPressureStatus", () => {
  it("returns null when there isn't enough history to establish a baseline", () => {
    expect(getBloodPressureStatus({ systolic: 120, diastolic: 80 }, [])).toBeNull();
    expect(
      getBloodPressureStatus({ systolic: 120, diastolic: 80 }, [
        { systolic: 118, diastolic: 78 },
        { systolic: 121, diastolic: 79 },
      ])
    ).toBeNull();
  });

  it("returns 'normal' when the reading is close to the user's own average", () => {
    const baseline = [
      { systolic: 118, diastolic: 78 },
      { systolic: 122, diastolic: 80 },
      { systolic: 120, diastolic: 79 },
    ];
    expect(getBloodPressureStatus({ systolic: 120, diastolic: 80 }, baseline)).toBe("normal");
  });

  it("returns 'outside_range' when systolic deviates well beyond the user's own average", () => {
    const baseline = [
      { systolic: 118, diastolic: 78 },
      { systolic: 122, diastolic: 80 },
      { systolic: 120, diastolic: 79 },
    ];
    expect(getBloodPressureStatus({ systolic: 150, diastolic: 80 }, baseline)).toBe("outside_range");
  });

  it("returns 'outside_range' when diastolic deviates well beyond the user's own average", () => {
    const baseline = [
      { systolic: 118, diastolic: 78 },
      { systolic: 122, diastolic: 80 },
      { systolic: 120, diastolic: 79 },
    ];
    expect(getBloodPressureStatus({ systolic: 120, diastolic: 100 }, baseline)).toBe("outside_range");
  });

  it("only averages up to the 10 most recent prior readings", () => {
    const baseline = [
      ...Array.from({ length: 10 }, () => ({ systolic: 150, diastolic: 95 })),
      ...Array.from({ length: 10 }, () => ({ systolic: 110, diastolic: 70 })),
    ];
    // If the older, lower readings were included in the average, 150/95
    // would read as "outside_range" against a pulled-down mean; since
    // only the most recent 10 (all 150/95) are used, it matches them.
    expect(getBloodPressureStatus({ systolic: 150, diastolic: 95 }, baseline)).toBe("normal");
  });
});
