import { dateRangeToUtcBounds, type DateRange, type UtcBounds } from "@/lib/dates/range";
import { getProfile } from "@/services/core/profile";

// Shared by every server page wiring up the Date Range Filter — reads
// the ?from=&to= search params, then converts them to UTC instants
// using the user's own profile timezone (never assume UTC — see
// lib/dates/range.ts's dateRangeToUtcBounds). `dateRange` (plain
// strings) is for plain `date` columns; `utcBounds` is for timestamptz
// columns — each page's service call picks whichever its date column
// needs (see labs.ts vs appointments.ts for the two shapes).
export async function resolveDateRangeParams(searchParams: {
  from?: string;
  to?: string;
}): Promise<{ dateRange: DateRange; utcBounds: UtcBounds }> {
  const dateRange: DateRange = { from: searchParams.from ?? null, to: searchParams.to ?? null };

  if (!dateRange.from && !dateRange.to) {
    return { dateRange, utcBounds: { fromUtc: null, toUtcExclusive: null } };
  }

  const profile = await getProfile();
  const utcBounds = dateRangeToUtcBounds(dateRange, profile?.timezone ?? "UTC");
  return { dateRange, utcBounds };
}
