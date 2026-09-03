import { RRule } from "rrule";

// Occurrence generation for recurring appointments (Calendar spec:
// "do not persist generated occurrences" / "the recurrence calculation
// must be deterministic"). Every surface that needs to display or find
// appointment occurrences (Calendar page, Dashboard's next-appointment
// card, the ICS feed) calls generateOccurrences()/nextOccurrence() —
// pure functions over the stored rows, so calling them twice for the
// same input always produces byte-identical output. Nothing here ever
// writes to the database.

export interface RecurrenceSourceRow {
  id: string;
  date_time: string; // ISO instant; DTSTART for a master, this row's own start for a standalone/override row
  end_time: string | null;
  recurrence_rule: string | null; // set only on a recurring master
  recurrence_excluded_occurrences: string[]; // ISO instants; only meaningful on a recurring master
  recurrence_parent_id: string | null; // set only on an override row
  recurrence_original_start: string | null; // set only on an override row
}

export interface AppointmentOccurrence<T extends RecurrenceSourceRow> {
  // The row this occurrence renders from: the master's own id for a
  // plain generated instance, or the override row's own id when one
  // exists for this instant.
  sourceId: string;
  appointment: T;
  occurrenceStart: string;
  occurrenceEnd: string | null;
  isRecurring: boolean;
  isOverride: boolean;
}

function toRRule(rule: string, dtstart: Date): RRule {
  const options = RRule.parseString(rule);
  return new RRule({ ...options, dtstart });
}

function isExcluded(occurrence: Date, excluded: string[]): boolean {
  const t = occurrence.getTime();
  return excluded.some((iso) => new Date(iso).getTime() === t);
}

// Expands every master row in `rows` into its occurrences overlapping
// [rangeStart, rangeEnd), applying exclusions, and merges in override
// rows that fall in the same range — a single flat, time-sorted list.
// `rows` should include every master appointment plus every override
// row whose recurrence_parent_id matches one of those masters (or a
// plain non-recurring appointment on its own).
export function generateOccurrences<T extends RecurrenceSourceRow>(
  rows: T[],
  rangeStart: Date,
  rangeEnd: Date
): AppointmentOccurrence<T>[] {
  const overridesByParent = new Map<string, T[]>();
  for (const row of rows) {
    if (row.recurrence_parent_id) {
      const list = overridesByParent.get(row.recurrence_parent_id) ?? [];
      list.push(row);
      overridesByParent.set(row.recurrence_parent_id, list);
    }
  }

  const results: AppointmentOccurrence<T>[] = [];

  for (const row of rows) {
    if (row.recurrence_parent_id) continue; // handled as an override below, not expanded on its own

    const durationMs = row.end_time ? new Date(row.end_time).getTime() - new Date(row.date_time).getTime() : null;
    const overrides = overridesByParent.get(row.id) ?? [];

    if (!row.recurrence_rule) {
      // Standalone, non-recurring appointment.
      const start = new Date(row.date_time);
      if (start >= rangeStart && start < rangeEnd) {
        results.push({
          sourceId: row.id,
          appointment: row,
          occurrenceStart: row.date_time,
          occurrenceEnd: row.end_time,
          isRecurring: false,
          isOverride: false,
        });
      }
      continue;
    }

    const dtstart = new Date(row.date_time);
    let rrule: RRule;
    try {
      rrule = toRRule(row.recurrence_rule, dtstart);
    } catch {
      continue; // a corrupted/unparseable rule must never crash the whole calendar
    }

    const occurrenceDates = rrule.between(rangeStart, rangeEnd, true);
    for (const occurrenceDate of occurrenceDates) {
      if (isExcluded(occurrenceDate, row.recurrence_excluded_occurrences)) continue;

      const occurrenceStartIso = occurrenceDate.toISOString();
      const occurrenceEndIso = durationMs !== null ? new Date(occurrenceDate.getTime() + durationMs).toISOString() : null;

      results.push({
        sourceId: row.id,
        appointment: row,
        occurrenceStart: occurrenceStartIso,
        occurrenceEnd: occurrenceEndIso,
        isRecurring: true,
        isOverride: false,
      });
    }

    for (const override of overrides) {
      const overrideStart = new Date(override.date_time);
      if (overrideStart >= rangeStart && overrideStart < rangeEnd) {
        results.push({
          sourceId: override.id,
          appointment: override,
          occurrenceStart: override.date_time,
          occurrenceEnd: override.end_time,
          isRecurring: true,
          isOverride: true,
        });
      }
    }
  }

  return results.sort((a, b) => new Date(a.occurrenceStart).getTime() - new Date(b.occurrenceStart).getTime());
}

// Dashboard's "next appointment" card: a recurring master's own
// date_time (DTSTART) can be far in the past, so this can't just read
// the row directly. Bounded to a 2-year lookahead — comfortably beyond
// any realistic "what's next" use case — rather than an unbounded scan.
export function nextOccurrence<T extends RecurrenceSourceRow>(
  rows: T[],
  from: Date
): AppointmentOccurrence<T> | null {
  const rangeEnd = new Date(from.getTime() + 2 * 365 * 86_400_000);
  const occurrences = generateOccurrences(rows, from, rangeEnd);
  return occurrences[0] ?? null;
}
