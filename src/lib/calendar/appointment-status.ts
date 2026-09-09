// "Past" is derived purely from the appointment's own scheduled
// date/time -- never stored, never based on created_at -- so it updates
// automatically as time passes with no write path of its own.
//
// When an end time is known (either the appointment's own end_time, or
// -- for a recurring occurrence -- the per-occurrence end computed by
// generateOccurrences()), that's the real cutoff: an appointment isn't
// "past" until it's actually over. When no end time exists (the common
// case -- end_time is optional and most appointments never set one),
// there's no way to know how long it lasts, so the start instant itself
// is used as the cutoff. That's a documented approximation, not a bug:
// a still-in-progress appointment with no recorded end time will show
// as "Past" from the moment it starts.
export function isAppointmentPast(occurrenceStart: string, occurrenceEnd: string | null, now: Date = new Date()): boolean {
  const cutoff = occurrenceEnd ?? occurrenceStart;
  return new Date(cutoff).getTime() < now.getTime();
}
