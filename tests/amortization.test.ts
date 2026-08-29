import { describe, it, expect } from "vitest";
import { computeAmortization, computeRequiredPaymentForTargetDate, computeWhatIf, computeDebtStrategy } from "@/lib/finance/amortization";

// Jan 1, 2026 UTC — constructed via Date.UTC (not `new Date(2026,0,1)`,
// which is local-time and would make the exact payoffDate string
// assertions below depend on the test runner's timezone).
const REF_DATE = new Date(Date.UTC(2026, 0, 1));

describe("computeAmortization", () => {
  it("returns zero months for a zero balance", () => {
    const result = computeAmortization({ balance: 0, apr: 20, monthlyPayment: 100, referenceDate: REF_DATE });
    expect(result).toEqual({ willPayOff: true, months: 0, totalInterest: 0, totalPaid: 0, payoffDate: "2026-01-01" });
  });

  it("computes exact months for 0% APR (simple division)", () => {
    const result = computeAmortization({ balance: 1200, apr: 0, monthlyPayment: 100, referenceDate: REF_DATE });
    expect(result.willPayOff).toBe(true);
    expect(result.months).toBe(12);
    expect(result.totalInterest).toBe(0);
    expect(result.totalPaid).toBe(1200);
    expect(result.payoffDate).toBe("2027-01-01");
  });

  it("reports willPayOff: false when the payment only covers interest", () => {
    // $1000 at 24% APR = 2%/month = $20/month interest-only.
    const result = computeAmortization({ balance: 1000, apr: 24, monthlyPayment: 20 });
    expect(result).toEqual({ willPayOff: false, months: null, totalInterest: null, totalPaid: null, payoffDate: null });
  });

  it("reports willPayOff: false when the payment is below interest-only", () => {
    const result = computeAmortization({ balance: 1000, apr: 24, monthlyPayment: 10 });
    expect(result.willPayOff).toBe(false);
  });

  it("pays off and accrues interest when the payment exceeds interest-only", () => {
    const result = computeAmortization({ balance: 1000, apr: 24, monthlyPayment: 25 });
    expect(result.willPayOff).toBe(true);
    expect(result.months).toBeGreaterThan(0);
    expect(result.totalInterest).toBeGreaterThan(0);
    expect(result.totalPaid).toBeCloseTo(1000 + (result.totalInterest ?? 0), 2);
  });

  it("a larger payment never takes more months to pay off the same balance", () => {
    const slower = computeAmortization({ balance: 5000, apr: 18, monthlyPayment: 150 });
    const faster = computeAmortization({ balance: 5000, apr: 18, monthlyPayment: 300 });
    expect(faster.willPayOff).toBe(true);
    expect(slower.willPayOff).toBe(true);
    expect((faster.months ?? Infinity)).toBeLessThan(slower.months ?? Infinity);
    expect((faster.totalInterest ?? Infinity)).toBeLessThan(slower.totalInterest ?? Infinity);
  });
});

describe("computeRequiredPaymentForTargetDate", () => {
  it("returns 0 for a zero balance", () => {
    expect(computeRequiredPaymentForTargetDate({ balance: 0, apr: 15, months: 12 })).toBe(0);
  });

  it("returns null for zero or negative months", () => {
    expect(computeRequiredPaymentForTargetDate({ balance: 1000, apr: 15, months: 0 })).toBeNull();
    expect(computeRequiredPaymentForTargetDate({ balance: 1000, apr: 15, months: -3 })).toBeNull();
  });

  it("computes exact payment for 0% APR (simple division)", () => {
    expect(computeRequiredPaymentForTargetDate({ balance: 1200, apr: 0, months: 12 })).toBe(100);
  });

  it("round-trips through computeAmortization: paying the required payment pays off in ~N months", () => {
    const months = 24;
    const payment = computeRequiredPaymentForTargetDate({ balance: 5000, apr: 12, months });
    expect(payment).not.toBeNull();
    const result = computeAmortization({ balance: 5000, apr: 12, monthlyPayment: payment! });
    expect(result.willPayOff).toBe(true);
    // Rounding the payment to 2 decimals can shift the payoff by at most a month either way.
    expect(Math.abs((result.months ?? 0) - months)).toBeLessThanOrEqual(1);
  });
});

describe("computeWhatIf", () => {
  it("computes exact months/interest saved at 0% APR", () => {
    const result = computeWhatIf({ balance: 1200, apr: 0, currentPayment: 100, additionalPayment: 100, referenceDate: REF_DATE });
    expect(result.baseline.months).toBe(12);
    expect(result.withExtra.months).toBe(6);
    expect(result.monthsSaved).toBe(6);
    expect(result.interestSaved).toBe(0);
  });

  it("shows positive interest saved when APR > 0", () => {
    const result = computeWhatIf({ balance: 5000, apr: 20, currentPayment: 150, additionalPayment: 100 });
    expect(result.monthsSaved).not.toBeNull();
    expect(result.interestSaved).not.toBeNull();
    expect(result.monthsSaved!).toBeGreaterThan(0);
    expect(result.interestSaved!).toBeGreaterThan(0);
  });

  it("returns null savings when the baseline payment never pays off the debt", () => {
    const result = computeWhatIf({ balance: 1000, apr: 24, currentPayment: 15, additionalPayment: 50 });
    expect(result.baseline.willPayOff).toBe(false);
    expect(result.withExtra.willPayOff).toBe(true);
    expect(result.monthsSaved).toBeNull();
    expect(result.interestSaved).toBeNull();
  });
});

describe("computeDebtStrategy", () => {
  it("returns an empty, already-paid-off result for no debts", () => {
    const result = computeDebtStrategy({ debts: [], extraMonthlyBudget: 100, strategy: "avalanche" });
    expect(result).toEqual({ strategy: "avalanche", order: [], months: 0, totalInterest: 0, payoffDates: {}, willPayOffAll: true });
  });

  it("snowball orders debts smallest-balance-first and matches a hand-verified payoff schedule at 0% APR", () => {
    const result = computeDebtStrategy({
      debts: [
        { id: "a", name: "Debt A", balance: 1000, apr: 0, minimumPayment: 50 },
        { id: "b", name: "Debt B", balance: 500, apr: 0, minimumPayment: 50 },
      ],
      extraMonthlyBudget: 100,
      strategy: "snowball",
      referenceDate: REF_DATE,
    });

    expect(result.order).toEqual(["b", "a"]);
    expect(result.willPayOffAll).toBe(true);
    expect(result.totalInterest).toBe(0);
    expect(result.months).toBe(8);
    expect(result.payoffDates.b).toBe("2026-05-01"); // paid off month 4
    expect(result.payoffDates.a).toBe("2026-09-01"); // paid off month 8
  });

  it("avalanche orders debts highest-APR-first", () => {
    const result = computeDebtStrategy({
      debts: [
        { id: "low-apr", name: "Low APR", balance: 1000, apr: 8, minimumPayment: 50 },
        { id: "high-apr", name: "High APR", balance: 1000, apr: 24, minimumPayment: 50 },
      ],
      extraMonthlyBudget: 200,
      strategy: "avalanche",
    });

    expect(result.order).toEqual(["high-apr", "low-apr"]);
    expect(result.willPayOffAll).toBe(true);
  });

  it("avalanche never pays more total interest than snowball on the same debts (well-established property)", () => {
    const debts = [
      { id: "a", name: "A", balance: 3000, apr: 22, minimumPayment: 60 },
      { id: "b", name: "B", balance: 800, apr: 9, minimumPayment: 30 },
      { id: "c", name: "C", balance: 1500, apr: 16, minimumPayment: 40 },
    ];
    const avalanche = computeDebtStrategy({ debts, extraMonthlyBudget: 150, strategy: "avalanche" });
    const snowball = computeDebtStrategy({ debts, extraMonthlyBudget: 150, strategy: "snowball" });

    expect(avalanche.willPayOffAll).toBe(true);
    expect(snowball.willPayOffAll).toBe(true);
    expect(avalanche.totalInterest!).toBeLessThanOrEqual(snowball.totalInterest!);
  });

  it("reports willPayOffAll: false when the budget never covers total interest", () => {
    const result = computeDebtStrategy({
      debts: [{ id: "a", name: "A", balance: 10000, apr: 30, minimumPayment: 50 }],
      extraMonthlyBudget: 0,
      strategy: "avalanche",
    });
    expect(result.willPayOffAll).toBe(false);
    expect(result.months).toBeNull();
    expect(result.totalInterest).toBeNull();
  });
});
