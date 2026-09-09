import type { Appointment } from "@/types/health/entities";

// update_appointment_scoped() (0048_calendar_appointments.sql,
// redefined in 0050_gig_driving.sql) writes the FULL field set every
// time -- it has no concept of "leave unspecified fields alone" -- so
// the current row's values must fill in anything the PATCH request
// didn't touch. Extracted out of the PATCH route (previously an inline
// object literal) so this merge logic is unit-testable on its own.
//
// Fields the client can send as an explicit `null` (to intentionally
// clear them) MUST be checked with `!== undefined`, never `??` --
// `??` treats that null the same as "not provided" and silently keeps
// the old value instead of clearing it. `description` was the one
// field on this list that used `??` by mistake: editing an appointment
// to remove its description silently kept the old text.
type AppointmentChanges = Partial<
  Pick<
    Appointment,
    | "title"
    | "description"
    | "provider_name"
    | "specialty"
    | "appointment_type"
    | "date_time"
    | "end_time"
    | "location"
    | "category"
    | "status"
    | "related_condition_id"
    | "preparation_notes"
    | "clinician_instructions"
    | "follow_up_date"
    | "notes"
    | "gig_platforms"
    | "gig_earnings_goal"
    | "reminder_lead_minutes"
    | "recurrence_rule"
  >
>;

export function mergeAppointmentFields(current: Appointment, changes: AppointmentChanges) {
  return {
    title: changes.title ?? current.title,
    description: changes.description !== undefined ? changes.description : current.description,
    provider_name: changes.provider_name ?? current.provider_name,
    specialty: changes.specialty ?? current.specialty,
    appointment_type: changes.appointment_type ?? current.appointment_type,
    date_time: changes.date_time ?? current.date_time,
    end_time: changes.end_time !== undefined ? changes.end_time : current.end_time,
    location: changes.location ?? current.location,
    category: changes.category ?? current.category,
    status: changes.status ?? current.status,
    related_condition_id: changes.related_condition_id !== undefined ? changes.related_condition_id : current.related_condition_id,
    preparation_notes: changes.preparation_notes ?? current.preparation_notes,
    clinician_instructions: changes.clinician_instructions ?? current.clinician_instructions,
    follow_up_date: changes.follow_up_date ?? current.follow_up_date,
    notes: changes.notes ?? current.notes,
    gig_platforms: changes.gig_platforms !== undefined ? changes.gig_platforms : current.gig_platforms,
    gig_earnings_goal: changes.gig_earnings_goal !== undefined ? changes.gig_earnings_goal : current.gig_earnings_goal,
    reminder_lead_minutes: changes.reminder_lead_minutes !== undefined ? changes.reminder_lead_minutes : current.reminder_lead_minutes,
    recurrence_rule: changes.recurrence_rule !== undefined ? changes.recurrence_rule : current.recurrence_rule,
  };
}
