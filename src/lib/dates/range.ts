import { fromZonedTime } from "date-fns-tz";

// Pure date-range math shared by the reusable DateRangeFilter component
// (client) and every server page that applies a range to a Supabase
// query (server) — one canonical implementation, not one per page.

export type QuickRangeKey = "today" | "7d" | "30d" | "3m" | "6m" | "thisYear" | "custom";

export const QUICK_RANGE_ORDER: QuickRangeKey[] = ["today", "7d", "30d", "3m", "6m", "thisYear", "custom"];

export interface DateRange {
  from: string | null; // "YYYY-MM-DD", inclusive
  to: string | null; // "YYYY-MM-DD", inclusive
}

function toDateString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// `now` is the caller's own local clock (always called client-side,
// where "today" unambiguously means the browser's local calendar day —
// no timezone plumbing needed here, unlike the UTC-bounds conversion
// below which runs server-side against a stored profile timezone).
export function computeQuickRange(key: Exclude<QuickRangeKey, "custom">, now: Date): { from: string; to: string } {
  const to = toDateString(now);

  switch (key) {
    case "today":
      return { from: to, to };
    case "7d": {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      return { from: toDateString(from), to };
    }
    case "30d": {
      const from = new Date(now);
      from.setDate(from.getDate() - 29);
      return { from: toDateString(from), to };
    }
    case "3m": {
      const from = new Date(now);
      from.setMonth(from.getMonth() - 3);
      return { from: toDateString(from), to };
    }
    case "6m": {
      const from = new Date(now);
      from.setMonth(from.getMonth() - 6);
      return { from: toDateString(from), to };
    }
    case "thisYear":
      return { from: `${now.getFullYear()}-01-01`, to };
  }
}

// Which quick-range button (if any) the current from/to exactly
// matches — drives the active/highlighted state in the filter UI.
// Returns "custom" when a range is set but doesn't match any quick
// preset, or null when no range is active at all.
export function matchQuickRange(range: DateRange, now: Date): QuickRangeKey | null {
  if (!range.from && !range.to) return null;

  for (const key of QUICK_RANGE_ORDER) {
    if (key === "custom") continue;
    const preset = computeQuickRange(key, now);
    if (preset.from === range.from && preset.to === range.to) return key;
  }
  return "custom";
}

export interface UtcBounds {
  // Inclusive lower bound, in UTC — pass to `.gte(column, fromUtc)`.
  fromUtc: string | null;
  // Exclusive upper bound (start of the day *after* `to`), in UTC — pass
  // to `.lt(column, toUtcExclusive)`. Exclusive-next-day avoids
  // 23:59:59.999-style off-by-a-moment edge cases against a timestamptz
  // column.
  toUtcExclusive: string | null;
}

// Converts a local-calendar-day range (as picked in the UI) into UTC
// instants for filtering a `timestamptz` column, honoring the user's
// own timezone (profiles.timezone) — the same reasoning as
// lib/notifications/scheduling.ts's computeScheduledFor: "May 26" means
// a different UTC instant in Tokyo than in Los Angeles, so the
// conversion must go through the user's actual zone, not assume UTC.
export function dateRangeToUtcBounds(range: DateRange, timezone: string): UtcBounds {
  const fromUtc = range.from ? fromZonedTime(`${range.from}T00:00:00`, timezone).toISOString() : null;

  let toUtcExclusive: string | null = null;
  if (range.to) {
    const startOfToDay = fromZonedTime(`${range.to}T00:00:00`, timezone);
    const startOfNextDay = new Date(startOfToDay.getTime() + 24 * 60 * 60 * 1000);
    toUtcExclusive = startOfNextDay.toISOString();
  }

  return { fromUtc, toUtcExclusive };
}
