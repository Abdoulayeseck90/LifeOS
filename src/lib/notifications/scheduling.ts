import { subDays, format } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import type { LeadTimeBucket, ReminderDeliveryChannel } from "@/types/core/entities";

// Notification Timing & Email Rules addendum: "7 days before" must land
// on the right *local calendar day* for the user, not "168 hours
// earlier in UTC" — those differ by an hour whenever a DST transition
// falls in between. This is the one place in the app that does that
// math, so every caller (appointments, monitoring) gets it right the
// same way instead of each hand-rolling their own subtraction.

export const LEAD_DAYS_BY_BUCKET: Record<LeadTimeBucket, number> = {
  seven_day: 7,
  three_day: 3,
  one_day: 1,
  day_of: 0,
  overdue: 0,
  custom: 0,
};

// Date-only events (monitoring's next_due_at) have no inherent time of
// day, so a fixed local hour stands in for "due that day" — chosen early
// enough that a "day of" reminder doesn't arrive after the day is over
// for someone who checks email in the morning.
const DEFAULT_LOCAL_HOUR = 8;

/**
 * Computes the UTC instant a reminder for `bucket` should fire at, given
 * an event due at `dueAt` (an ISO date "YYYY-MM-DD" if `isDateOnly`, or
 * a full ISO timestamp otherwise) and the user's IANA `timezone`.
 *
 * The user's own spec example is calendar-date arithmetic only ("Due
 * Sept 30 → 7-day reminder Sept 23"), not time-of-day arithmetic — so
 * every bucket, including "day of" for appointments, resolves to a
 * fixed local time (08:00) on the target calendar day, rather than
 * trying to preserve the appointment's own time-of-day. This also keeps
 * the two input shapes on one code path: a full timestamp is first
 * reduced to "which local calendar day is this" (via toZonedTime, which
 * correctly moves the day back when a late-UTC timestamp is still
 * "yesterday" locally), then handled identically to a date-only event.
 */
export function computeScheduledFor(
  dueAt: string,
  isDateOnly: boolean,
  bucket: LeadTimeBucket,
  timezone: string,
  // Documents' "N days before expiration" (Section 77) isn't one of the
  // fixed 7/3/1/day-of buckets every other category shares — this lets
  // that one case reuse the same DST-safe math below with bucket
  // "custom" and an arbitrary lead-day count, instead of every other
  // caller's LEAD_DAYS_BY_BUCKET lookup changing shape.
  customLeadDays?: number
): string {
  const leadDays = customLeadDays ?? LEAD_DAYS_BY_BUCKET[bucket];

  const dueDateStr = isDateOnly ? dueAt : format(toZonedTime(dueAt, timezone), "yyyy-MM-dd");

  // Subtract calendar days at noon UTC (never crosses a day boundary
  // from the subtraction itself), then anchor that calendar day to a
  // fixed local time in `timezone` — this is what stays correct across
  // a DST transition between the target day and today.
  const dueAtNoon = new Date(`${dueDateStr}T12:00:00Z`);
  const targetDate = subDays(dueAtNoon, leadDays);
  const targetDateStr = format(targetDate, "yyyy-MM-dd");

  return fromZonedTime(`${targetDateStr}T${String(DEFAULT_LOCAL_HOUR).padStart(2, "0")}:00:00`, timezone).toISOString();
}

/**
 * Idempotency key for a scheduled reminder: unique per user via a
 * partial unique index on reminders(user_id, reminder_key) — the same
 * (entity, bucket, channel) can only ever have one live row, so
 * re-scheduling (e.g. a rescheduled appointment) upserts in place
 * instead of creating a duplicate.
 */
export function buildReminderKey(
  relatedEntityType: string,
  relatedEntityId: string,
  bucket: LeadTimeBucket,
  channel: ReminderDeliveryChannel,
  overdueCycle?: number
): string {
  const bucketPart = bucket === "overdue" ? `overdue-${overdueCycle ?? 0}` : bucket;
  return `${relatedEntityType}:${relatedEntityId}:${bucketPart}:${channel}`;
}
