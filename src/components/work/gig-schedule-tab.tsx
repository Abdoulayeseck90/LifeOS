import type { Appointment, Condition } from "@/types/health/entities";
import type { AppointmentOccurrence } from "@/lib/calendar/recurrence";
import { GigScheduleAddButton } from "@/components/work/gig-schedule-add-button";
import { GigScheduleList } from "@/components/work/gig-schedule-list";

export function GigScheduleTab({
  occurrences,
  conditions,
}: {
  occurrences: AppointmentOccurrence<Appointment>[];
  conditions: Condition[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <GigScheduleAddButton conditions={conditions} />
      </div>
      <GigScheduleList occurrences={occurrences} conditions={conditions} />
    </div>
  );
}
