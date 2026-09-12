import { combineWorkScheduleTimes } from "@/lib/calendar/work-schedule-time";

// Plan Week (Gig Driving spec, Section 4): pure date-math turning a
// week-starting date + one independently-configured row per day into
// the flat list of standalone appointment field-sets sent to
// POST /api/calendar/appointments/bulk. No recurrence_rule/parent is
// ever set -- each generated shift is a plain standalone appointment,
// identical in shape to one created through the single Add Shift
// Schedule form (Section 11: bulk-generated schedules must behave
// exactly like a manually created one).

export interface WeekDayPlan {
  included: boolean;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  platforms: string[];
  earningsGoal: string; // raw form input; "" = no goal
  notes: string;
}

export interface WeekPlanItem {
  title: string;
  date_time: string;
  end_time: string;
  category: "work";
  status: "scheduled";
  gig_platforms: string[] | null;
  gig_earnings_goal: number | null;
  notes: string | null;
}

// `days[i]` corresponds to `weekStartDate + i` days, i = 0..6, in
// whatever order the caller built the 7 rows in (no hardcoded
// Monday-first assumption -- the week simply starts on whatever date
// the user picked).
export function buildWeekPlanItems(weekStartDate: string, days: WeekDayPlan[], title: string): WeekPlanItem[] {
  const start = new Date(`${weekStartDate}T00:00:00`);
  const pad = (n: number) => String(n).padStart(2, "0");
  const items: WeekPlanItem[] = [];

  days.forEach((day, index) => {
    if (!day.included || !day.startTime || !day.endTime) return;

    const d = new Date(start);
    d.setDate(d.getDate() + index);
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const { start: startIso, end: endIso } = combineWorkScheduleTimes(dateStr, day.startTime, day.endTime);

    items.push({
      title,
      date_time: startIso,
      end_time: endIso,
      category: "work",
      status: "scheduled",
      gig_platforms: day.platforms.length > 0 ? day.platforms : null,
      gig_earnings_goal: day.earningsGoal.trim() ? Number(day.earningsGoal) : null,
      notes: day.notes.trim() || null,
    });
  });

  return items;
}

export interface WeekPlanTotals {
  totalHours: number;
  totalGoal: number;
  shiftCount: number;
}

export function computeWeekPlanTotals(days: WeekDayPlan[]): WeekPlanTotals {
  let totalHours = 0;
  let totalGoal = 0;
  let shiftCount = 0;

  for (const day of days) {
    if (!day.included || !day.startTime || !day.endTime) continue;
    shiftCount += 1;
    const { start, end } = combineWorkScheduleTimes("2000-01-01", day.startTime, day.endTime);
    totalHours += (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000;
    if (day.earningsGoal.trim()) totalGoal += Number(day.earningsGoal);
  }

  return { totalHours, totalGoal, shiftCount };
}
