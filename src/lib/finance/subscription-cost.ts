import type { SubscriptionBillingFrequency } from "@/types/core/entities";

// Subscriptions spec, Section 29: monthly/annual cost calculators — pure
// unit conversion by billing_frequency, computed live wherever needed
// (card display, Finance Overview total), never stored redundantly.
export function toMonthlyCost(amount: number, frequency: SubscriptionBillingFrequency): number {
  switch (frequency) {
    case "weekly":
      return (amount * 52) / 12;
    case "monthly":
      return amount;
    case "quarterly":
      return amount / 3;
    case "yearly":
      return amount / 12;
  }
}

export function toAnnualCost(amount: number, frequency: SubscriptionBillingFrequency): number {
  switch (frequency) {
    case "weekly":
      return amount * 52;
    case "monthly":
      return amount * 12;
    case "quarterly":
      return amount * 4;
    case "yearly":
      return amount;
  }
}
