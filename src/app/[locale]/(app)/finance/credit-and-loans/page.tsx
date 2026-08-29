import { getTranslations } from "next-intl/server";
import { listCreditCards, listLoans } from "@/services/core/credit-and-loans";
import { computeAmortization, toMonthlyAmount, type StrategyDebtInput } from "@/lib/finance/amortization";
import { CreditCardAddButton } from "@/components/finance/credit-card-add-button";
import { CreditCardCard } from "@/components/finance/credit-card-card";
import { LoanAddButton } from "@/components/finance/loan-add-button";
import { LoanCard } from "@/components/finance/loan-card";
import { DebtStrategy } from "@/components/finance/debt-strategy";
import { InfoCard } from "@/components/core/info-card";
import { SectionHeader } from "@/components/core/section-header";
import { Landmark, CreditCard as CreditCardIcon, Wallet, CalendarClock } from "lucide-react";

// Credit & Loans spec, Section 24/31: lives entirely inside Finance,
// never a top-level module. The dashboard answers "what do I owe /
// what am I paying / when's it due" with clean cards, never a table.
export const dynamic = "force-dynamic";

function formatAmount(amount: number): string {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default async function CreditAndLoansPage() {
  const t = await getTranslations("finance.creditAndLoans");
  const [creditCards, loans] = await Promise.all([listCreditCards(), listLoans()]);

  const totalDebt = creditCards.reduce((sum, c) => sum + c.balance, 0) + loans.reduce((sum, l) => sum + l.balance, 0);

  const cardMonthlyPayments = creditCards.map((c) => c.current_payment ?? c.minimum_payment ?? 0);
  const loanMonthlyPayments = loans.map((l) => (l.minimum_payment != null ? toMonthlyAmount(l.minimum_payment, l.payment_frequency) : 0));
  const totalMonthlyPayments = [...cardMonthlyPayments, ...loanMonthlyPayments].reduce((sum, p) => sum + p, 0);

  const cardInterestEstimates = creditCards.map((c) => {
    const payment = c.current_payment ?? c.minimum_payment;
    if (payment == null) return null;
    return computeAmortization({ balance: c.balance, apr: c.apr, monthlyPayment: payment }).totalInterest;
  });
  const loanInterestEstimates = loans.map((l) => {
    if (l.minimum_payment == null) return null;
    const monthly = toMonthlyAmount(l.minimum_payment, l.payment_frequency);
    return computeAmortization({ balance: l.balance, apr: l.apr, monthlyPayment: monthly }).totalInterest;
  });
  const totalEstimatedInterest = [...cardInterestEstimates, ...loanInterestEstimates]
    .filter((v): v is number => v !== null)
    .reduce((sum, v) => sum + v, 0);

  const upcomingDates = [...creditCards.map((c) => c.due_date), ...loans.map((l) => l.next_payment_date)].filter((d): d is string => !!d).sort();
  const nextDueDate = upcomingDates[0] ?? null;

  const hasAnyDebt = creditCards.length > 0 || loans.length > 0;

  const strategyDebts: StrategyDebtInput[] = [
    ...creditCards
      .filter((c) => (c.current_payment ?? c.minimum_payment) != null)
      .map((c) => ({ id: `card-${c.id}`, name: c.name, balance: c.balance, apr: c.apr, minimumPayment: c.current_payment ?? c.minimum_payment ?? 0 })),
    ...loans
      .filter((l) => l.minimum_payment != null)
      .map((l) => ({
        id: `loan-${l.id}`,
        name: l.name,
        balance: l.balance,
        apr: l.apr,
        minimumPayment: toMonthlyAmount(l.minimum_payment ?? 0, l.payment_frequency),
      })),
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-secondary">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
      </div>

      {!hasAnyDebt ? (
        <div className="rounded-card border border-dashed border-surface p-8 text-center">
          <p className="text-sm font-medium text-secondary">{t("emptyTitle")}</p>
          <p className="mt-1 text-sm text-muted">{t("emptyMessage")}</p>
          <div className="mt-4 flex justify-center gap-2">
            <CreditCardAddButton />
            <LoanAddButton />
          </div>
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoCard icon={Wallet} label={t("totalDebt")}>
              <p className="text-2xl font-semibold text-secondary">{formatAmount(totalDebt)}</p>
            </InfoCard>
            <InfoCard icon={CreditCardIcon} label={t("totalMonthlyPayments")}>
              <p className="text-2xl font-semibold text-secondary">{formatAmount(totalMonthlyPayments)}</p>
            </InfoCard>
            <InfoCard icon={Landmark} label={t("totalEstimatedInterest")}>
              <p className="text-2xl font-semibold text-secondary">{formatAmount(totalEstimatedInterest)}</p>
            </InfoCard>
            <InfoCard icon={CalendarClock} label={t("nextDueDate")}>
              <p className="text-2xl font-semibold text-secondary">{nextDueDate ?? t("none")}</p>
            </InfoCard>
          </div>

          <div className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <SectionHeader title={t("creditCards")} />
              <CreditCardAddButton />
            </div>
            {creditCards.length === 0 ? (
              <p className="text-sm text-muted">{t("emptyCreditCards")}</p>
            ) : (
              <div className="flex flex-col gap-3">
                {creditCards.map((card) => (
                  <CreditCardCard key={card.id} card={card} />
                ))}
              </div>
            )}
          </div>

          <div className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <SectionHeader title={t("loans")} />
              <LoanAddButton />
            </div>
            {loans.length === 0 ? (
              <p className="text-sm text-muted">{t("emptyLoans")}</p>
            ) : (
              <div className="flex flex-col gap-3">
                {loans.map((loan) => (
                  <LoanCard key={loan.id} loan={loan} />
                ))}
              </div>
            )}
          </div>

          {strategyDebts.length >= 2 && (
            <div>
              <SectionHeader title={t("debtStrategy")} />
              <DebtStrategy debts={strategyDebts} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
