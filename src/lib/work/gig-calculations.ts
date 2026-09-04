import type { GigEarning, GigExpense, GigPlatform, GigShift, GigTaxSettings } from "@/types/work/entities";

// Gig Driving spec, Section 2/10: every number on the Overview/
// Analytics/Taxes views is derived from stored shifts/earnings/expenses
// here — nothing is ever hardcoded. Pure functions, no I/O, so every
// calculation is directly unit-testable (tests/gig-calculations.test.ts).

export interface GigShiftWithRelations extends GigShift {
  earnings: GigEarning[];
  expenses: GigExpense[];
}

// total_miles is never stored (0050_gig_driving.sql) -- always derived
// here from the two odometer readings, so it can never drift from them.
// null while a shift is still in progress (no end_odometer yet).
export function shiftTotalMiles(shift: Pick<GigShift, "start_odometer" | "end_odometer">): number | null {
  if (shift.end_odometer === null) return null;
  return Math.max(0, shift.end_odometer - shift.start_odometer);
}

export function shiftDurationHours(shift: Pick<GigShift, "start_time" | "end_time">): number | null {
  if (!shift.end_time) return null;
  const ms = new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime();
  return Math.max(0, ms / 3_600_000);
}

export interface EarningsTotal {
  gross: number;
  tips: number;
  bonuses: number;
  other: number;
  total: number;
}

export function sumEarnings(earnings: GigEarning[]): EarningsTotal {
  const gross = earnings.reduce((sum, e) => sum + e.gross, 0);
  const tips = earnings.reduce((sum, e) => sum + e.tips, 0);
  const bonuses = earnings.reduce((sum, e) => sum + e.bonuses, 0);
  const other = earnings.reduce((sum, e) => sum + e.other, 0);
  return { gross, tips, bonuses, other, total: gross + tips + bonuses + other };
}

export function sumExpenses(expenses: GigExpense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

export interface GigMetrics {
  grossEarnings: number;
  totalExpenses: number;
  estimatedNet: number;
  miles: number;
  hours: number;
  grossPerHour: number | null;
  netPerHour: number | null;
  grossPerMile: number | null;
  netPerMile: number | null;
}

// The one shared aggregation every Overview/Weekly/Monthly/Tax-year
// summary calls with a different, pre-filtered slice of shifts — never
// duplicated per view.
export function computeGigMetrics(shifts: GigShiftWithRelations[]): GigMetrics {
  let grossEarnings = 0;
  let totalExpenses = 0;
  let miles = 0;
  let hours = 0;

  for (const shift of shifts) {
    grossEarnings += sumEarnings(shift.earnings).total;
    totalExpenses += sumExpenses(shift.expenses);
    miles += shiftTotalMiles(shift) ?? 0;
    hours += shiftDurationHours(shift) ?? 0;
  }

  const estimatedNet = grossEarnings - totalExpenses;

  return {
    grossEarnings,
    totalExpenses,
    estimatedNet,
    miles,
    hours,
    grossPerHour: hours > 0 ? grossEarnings / hours : null,
    netPerHour: hours > 0 ? estimatedNet / hours : null,
    grossPerMile: miles > 0 ? grossEarnings / miles : null,
    netPerMile: miles > 0 ? estimatedNet / miles : null,
  };
}

// Per-platform breakdown (spec Section 10: "Spark Gross/hour: $25.40").
// Known, deliberate simplification: a shift can run multiple platforms
// at once (spec explicitly allows this), and hours/miles are captured
// at the whole-shift level, not separable per platform within it — so a
// multi-platform shift's hours/miles count toward EVERY platform it
// included, not split between them. That's an honest approximation
// (the app has no way to know how much of a mixed shift was "really"
// DoorDash vs Spark), not an invented precise split — never presented
// as more exact than that.
export function computePlatformBreakdown(shifts: GigShiftWithRelations[]): Record<string, GigMetrics> {
  const platforms = new Set<GigPlatform>();
  for (const shift of shifts) {
    for (const p of shift.platforms) platforms.add(p);
    for (const e of shift.earnings) platforms.add(e.platform);
  }

  const result: Record<string, GigMetrics> = {};
  for (const platform of platforms) {
    const relevantShifts = shifts
      .filter((s) => s.platforms.includes(platform) || s.earnings.some((e) => e.platform === platform))
      .map((s) => ({ ...s, earnings: s.earnings.filter((e) => e.platform === platform) }));
    result[platform] = computeGigMetrics(relevantShifts);
  }
  return result;
}

export interface TaxYearSummary {
  incomeByPlatform: Record<string, number>;
  totalIncome: number;
  businessMiles: number;
  recordedExpenses: number;
  mileageRate: number | null;
  estimatedMileageDeduction: number | null;
  estimatedNetProfit: number;
}

// Spec Section 9: clearly-labeled ESTIMATE, never a filed/definitive tax
// figure. mileageRate comes from the user's own gig_tax_settings row
// for that year (never a hardcoded IRS rate) — null (not a fallback
// number) when the user hasn't configured one yet, so the UI can show
// "set a rate" instead of silently implying $0.
//
// `expenses` is the full gig_expenses ledger for the year, passed in
// explicitly rather than derived from each shift's `expenses` (which only
// holds rows with a matching shift_id) — a standalone expense with no
// shift_id (e.g. insurance, a fill-up on a non-shift day) is still a real
// recorded expense and must count here too, not silently disappear.
export function computeTaxYearSummary(shifts: GigShiftWithRelations[], expenses: GigExpense[], taxSettings: GigTaxSettings | null): TaxYearSummary {
  const incomeByPlatform: Record<string, number> = {};
  let totalIncome = 0;
  let businessMiles = 0;

  for (const shift of shifts) {
    for (const earning of shift.earnings) {
      const total = earning.gross + earning.tips + earning.bonuses + earning.other;
      incomeByPlatform[earning.platform] = (incomeByPlatform[earning.platform] ?? 0) + total;
      totalIncome += total;
    }
    businessMiles += shiftTotalMiles(shift) ?? 0;
  }

  const recordedExpenses = sumExpenses(expenses);
  const mileageRate = taxSettings?.standard_mileage_rate ?? null;
  const estimatedMileageDeduction = mileageRate !== null ? businessMiles * mileageRate : null;
  const estimatedNetProfit = totalIncome - recordedExpenses - (estimatedMileageDeduction ?? 0);

  return { incomeByPlatform, totalIncome, businessMiles, recordedExpenses, mileageRate, estimatedMileageDeduction, estimatedNetProfit };
}

// Spec Section 11: Schedule vs Actual. `scheduledDurationHours`/
// `scheduledGoal` come from the linked appointment (date_time/end_time/
// gig_earnings_goal); the actual side reuses the same shift metrics
// above.
export interface ScheduleVsActual {
  plannedHours: number | null;
  actualHours: number | null;
  goal: number | null;
  actualGross: number;
}

export function computeScheduleVsActual(
  scheduled: { date_time: string; end_time: string | null; gig_earnings_goal: number | null } | null,
  shift: GigShiftWithRelations
): ScheduleVsActual {
  const plannedHours =
    scheduled?.end_time != null
      ? Math.max(0, (new Date(scheduled.end_time).getTime() - new Date(scheduled.date_time).getTime()) / 3_600_000)
      : null;

  return {
    plannedHours,
    actualHours: shiftDurationHours(shift),
    goal: scheduled?.gig_earnings_goal ?? null,
    actualGross: sumEarnings(shift.earnings).total,
  };
}
