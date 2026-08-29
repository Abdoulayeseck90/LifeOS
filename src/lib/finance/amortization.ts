// Credit & Loans spec, Section 27-30 — the debt-payoff calculator
// engine. Pure functions, no I/O, no fake data: every result is
// computed live from whatever balance/APR/payment the user entered.
// Simulation-based (month-by-month) rather than closed-form log/annuity
// algebra everywhere — easier to verify correct, handles the final
// partial-payment month naturally, and behaves the same whether APR is
// 0 or not. Every UI surface using this must show "Estimate based on
// the information provided" per spec.

const MAX_MONTHS = 1200; // 100-year safety cap against infinite loops
const EPSILON = 0.005;

export interface AmortizationResult {
  willPayOff: boolean;
  months: number | null;
  totalInterest: number | null;
  totalPaid: number | null;
  payoffDate: string | null; // YYYY-MM-DD
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// UTC throughout, not local time — a local-time `new Date(y, m, d)`
// combined with `.toISOString()` can silently roll the date back or
// forward a day depending on the server's timezone offset relative to
// UTC. Month-granularity results don't need wall-clock precision, so
// working entirely in UTC sidesteps that class of bug.
function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()));
}

// Re-derives via UTC getters before serializing, so this is safe for
// ANY input Date — including a caller-supplied `referenceDate` that
// may have been constructed in local time — not just ones already
// built through addMonths above.
function toIsoDate(date: Date): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString().slice(0, 10);
}

function monthlyRate(apr: number): number {
  return apr / 100 / 12;
}

// Section 27: "Show required monthly payment, estimated payoff date,
// estimated interest, total amount paid." A payment at or below the
// current month's interest charge never reduces the balance — that's
// reported as willPayOff: false rather than looping forever or
// returning a misleading number.
export function computeAmortization({
  balance,
  apr,
  monthlyPayment,
  referenceDate = new Date(),
}: {
  balance: number;
  apr: number;
  monthlyPayment: number;
  referenceDate?: Date;
}): AmortizationResult {
  if (balance <= 0) {
    return { willPayOff: true, months: 0, totalInterest: 0, totalPaid: 0, payoffDate: toIsoDate(referenceDate) };
  }

  const rate = monthlyRate(apr);
  if (monthlyPayment <= balance * rate) {
    return { willPayOff: false, months: null, totalInterest: null, totalPaid: null, payoffDate: null };
  }

  let remaining = balance;
  let totalInterest = 0;
  let months = 0;

  while (remaining > EPSILON && months < MAX_MONTHS) {
    const interest = remaining * rate;
    const principalPayment = Math.min(monthlyPayment - interest, remaining);
    remaining -= principalPayment;
    totalInterest += interest;
    months += 1;
  }

  if (remaining > EPSILON) {
    // Hit the safety cap without paying off — treat the same as "will
    // never pay off" rather than reporting a misleading 100-year figure.
    return { willPayOff: false, months: null, totalInterest: null, totalPaid: null, payoffDate: null };
  }

  return {
    willPayOff: true,
    months,
    totalInterest: round2(totalInterest),
    totalPaid: round2(balance + totalInterest),
    payoffDate: toIsoDate(addMonths(referenceDate, months)),
  };
}

// Section 28: "I want this paid off by [date]" -> required monthly
// payment. Standard annuity-payment formula; falls back to simple
// division when APR is 0 (the formula's r=0 case is undefined).
export function computeRequiredPaymentForTargetDate({ balance, apr, months }: { balance: number; apr: number; months: number }): number | null {
  if (balance <= 0) return 0;
  if (months <= 0) return null;

  const rate = monthlyRate(apr);
  if (rate === 0) return round2(balance / months);

  const factor = Math.pow(1 + rate, months);
  const payment = (balance * rate * factor) / (factor - 1);
  return round2(payment);
}

export interface WhatIfResult {
  baseline: AmortizationResult;
  withExtra: AmortizationResult;
  monthsSaved: number | null;
  interestSaved: number | null;
}

// Section 29: "What if I pay more?" — compares the current payment
// against current + additional, recalculated on every input change by
// the caller (this function itself is just the pure comparison).
export function computeWhatIf({
  balance,
  apr,
  currentPayment,
  additionalPayment,
  referenceDate = new Date(),
}: {
  balance: number;
  apr: number;
  currentPayment: number;
  additionalPayment: number;
  referenceDate?: Date;
}): WhatIfResult {
  const baseline = computeAmortization({ balance, apr, monthlyPayment: currentPayment, referenceDate });
  const withExtra = computeAmortization({ balance, apr, monthlyPayment: currentPayment + additionalPayment, referenceDate });

  const monthsSaved = baseline.willPayOff && withExtra.willPayOff && baseline.months !== null && withExtra.months !== null ? baseline.months - withExtra.months : null;
  const interestSaved =
    baseline.willPayOff && withExtra.willPayOff && baseline.totalInterest !== null && withExtra.totalInterest !== null
      ? round2(baseline.totalInterest - withExtra.totalInterest)
      : null;

  return { baseline, withExtra, monthsSaved, interestSaved };
}

// Loans' minimum_payment is at whatever payment_frequency the loan
// actually uses — every calculator here works in monthly terms, so
// this converts once at the display layer rather than baking a
// frequency assumption into the simulation functions themselves.
export function toMonthlyAmount(amount: number, frequency: "weekly" | "biweekly" | "monthly" | null): number {
  if (frequency === "weekly") return (amount * 52) / 12;
  if (frequency === "biweekly") return (amount * 26) / 12;
  return amount;
}

export type DebtStrategyKind = "avalanche" | "snowball";

export interface StrategyDebtInput {
  id: string;
  name: string;
  balance: number;
  apr: number;
  minimumPayment: number;
}

export interface DebtStrategyResult {
  strategy: DebtStrategyKind;
  order: string[]; // debt ids, in payoff-priority order
  months: number | null;
  totalInterest: number | null;
  payoffDates: Record<string, string>; // debt id -> ISO date it reaches $0
  willPayOffAll: boolean;
}

// Section 30: Avalanche (highest APR first) vs Snowball (smallest
// balance first). Priority order is fixed at the start from each
// debt's INITIAL balance/APR (not re-sorted month to month) — the
// simplest assumption to state plainly to the user, per spec's "show
// the assumptions behind calculations." Each month: interest accrues
// on every open debt, minimums are paid on every open debt, then the
// extra budget PLUS the minimums freed up by already-paid-off debts
// (the actual "snowball"/"avalanche" effect) goes to the current
// highest-priority open debt, cascading to the next if it pays off
// with room to spare in the same month.
export function computeDebtStrategy({
  debts,
  extraMonthlyBudget,
  strategy,
  referenceDate = new Date(),
}: {
  debts: StrategyDebtInput[];
  extraMonthlyBudget: number;
  strategy: DebtStrategyKind;
  referenceDate?: Date;
}): DebtStrategyResult {
  if (debts.length === 0) {
    return { strategy, order: [], months: 0, totalInterest: 0, payoffDates: {}, willPayOffAll: true };
  }

  const order = [...debts]
    .sort((a, b) => (strategy === "avalanche" ? b.apr - a.apr : a.balance - b.balance))
    .map((d) => d.id);

  const rates = new Map(debts.map((d) => [d.id, monthlyRate(d.apr)]));
  const minimums = new Map(debts.map((d) => [d.id, d.minimumPayment]));
  const balances = new Map(debts.map((d) => [d.id, d.balance]));
  const totalMinimums = debts.reduce((sum, d) => sum + d.minimumPayment, 0);

  let totalInterest = 0;
  let month = 0;
  const payoffDates: Record<string, string> = {};

  const stillOpen = () => [...balances.values()].some((b) => b > EPSILON);

  while (stillOpen() && month < MAX_MONTHS) {
    month += 1;

    // 1. Interest accrues on every open debt.
    for (const id of order) {
      const bal = balances.get(id)!;
      if (bal <= EPSILON) continue;
      const interest = bal * rates.get(id)!;
      balances.set(id, bal + interest);
      totalInterest += interest;
    }

    // 2. Minimum payment on every still-open debt.
    let activeMinimums = 0;
    for (const id of order) {
      const bal = balances.get(id)!;
      if (bal <= EPSILON) continue;
      activeMinimums += minimums.get(id)!;
      const payment = Math.min(minimums.get(id)!, bal);
      balances.set(id, bal - payment);
    }

    // 3. Extra budget + freed-up minimums cascade down the priority order.
    let extra = extraMonthlyBudget + (totalMinimums - activeMinimums);
    for (const id of order) {
      if (extra <= EPSILON) break;
      const bal = balances.get(id)!;
      if (bal <= EPSILON) continue;
      const payment = Math.min(extra, bal);
      balances.set(id, bal - payment);
      extra -= payment;
    }

    // 4. Record payoff month for anything that just hit zero.
    for (const id of order) {
      if (!payoffDates[id] && balances.get(id)! <= EPSILON) {
        payoffDates[id] = toIsoDate(addMonths(referenceDate, month));
      }
    }
  }

  const willPayOffAll = !stillOpen();
  return {
    strategy,
    order,
    months: willPayOffAll ? month : null,
    totalInterest: willPayOffAll ? round2(totalInterest) : null,
    payoffDates,
    willPayOffAll,
  };
}
