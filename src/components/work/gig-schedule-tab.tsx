import type { Appointment, Condition } from "@/types/health/entities";
import type { AppointmentOccurrence } from "@/lib/calendar/recurrence";
import { GigScheduleAddButton } from "@/components/work/gig-schedule-add-button";
import { GigScheduleList } from "@/components/work/gig-schedule-list";
import { GigPlanWeekModal } from "@/components/work/gig-plan-week-modal";
import { GigPlanMonthModal } from "@/components/work/gig-plan-month-modal";

// Gig Driving spec, Section 12 (Quick Actions): Plan Shift / Plan Week /
// Plan Month side by side. Plan Week/Month reuse the same
// POST /api/calendar/appointments/bulk endpoint and generate standalone
// appointment rows -- Plan Shift (GigScheduleAddButton) already reuses
// the full Calendar AppointmentForm, unchanged.
export function GigScheduleTab({
  occurrences,
  conditions,
}: {
  occurrences: AppointmentOccurrence<Appointment>[];
  conditions: Condition[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap justify-end gap-2">
        <GigPlanMonthModal />
        <GigPlanWeekModal />
        <GigScheduleAddButton conditions={conditions} />
      </div>
      <GigScheduleList occurrences={occurrences} conditions={conditions} />
    </div>
  );
}
