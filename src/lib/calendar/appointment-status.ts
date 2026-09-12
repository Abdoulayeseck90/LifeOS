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

// Whether editing/deleting this appointment should prompt for a
// this/following/series scope. True only for an actual recurring
// master (recurrence_rule set). An "override" row (recurrence_parent_id
// set, recurrence_rule always null per appointments_override_shape)
// already represents exactly one resolved occurrence -- there is
// nothing left to disambiguate, and the this/following RPC branches
// only support a master (they raise on an override). Checking
// recurrence_parent_id here too was the actual bug: it made every
// already-edited occurrence pop the scope dialog again, and "this"/
// "following" would then fail every time.
export function isRecurringMaster(appointment: { recurrence_rule: string | null }): boolean {
  return Boolean(appointment.recurrence_rule);
}
