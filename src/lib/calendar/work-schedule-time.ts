// Shared date/time combination logic for Gig Driving ("work" category)
// scheduling: the single AppointmentForm date/start/end inputs, and the
// Plan Week / Plan Month bulk-planning modals all need the exact same
// "date + time-of-day -> instant, with overnight rollover" behavior, so
// it lives here once rather than being copy-pasted three times.

export interface WorkScheduleTimes {
  start: string; // ISO instant
  end: string; // ISO instant
}

// Combines a calendar date ("YYYY-MM-DD") with separate start/end
// time-of-day strings ("HH:mm") into full ISO instants, parsed as local
// time (same approach as combineDateTime() in appointment-form.tsx --
// a bare "YYYY-MM-DDTHH:mm" has no timezone, and `new Date()` parsing
// that as local time is exactly right here).
//
// If the end time is not strictly after the start time on the given
// date, the shift is treated as crossing midnight and end rolls forward
// to the next calendar day -- e.g. date=2026-09-19, start=21:00,
// end=02:00 -> ends 2026-09-20T02:00 local (a 5 hour shift). This is
// the one rule that supports overnight shifts without a separate
// end-date picker. Callers that want to reject a same-day zero-duration
// shift (identical start/end) should check for that before calling this
// -- this function will otherwise interpret it as a 24-hour shift.
export function combineWorkScheduleTimes(date: string, startTime: string, endTime: string): WorkScheduleTimes {
  const start = new Date(`${date}T${startTime}`);
  let end = new Date(`${date}T${endTime}`);
  if (end.getTime() <= start.getTime()) {
    end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

// Inverse of combining a datetime-local value's date/time-of-day parts
// (toDatetimeLocalValue in appointment-form.tsx) -- splits an ISO
// instant back into local-time "YYYY-MM-DD" / "HH:mm" parts for
// prefilling the Date/Start time/End time inputs when editing an
// existing work schedule.
export function splitDateTimeLocal(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}
