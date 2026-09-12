import { combineWorkScheduleTimes } from "@/lib/calendar/work-schedule-time";

// Plan Month (Gig Driving spec, Section 5): pure date-math expanding a
// selected month + one configured row per selected weekday (JS
// Date#getDay() convention, 0=Sunday..6=Saturday) into a flat preview
// list of individual dates -- never one giant record for the month.
// Each entry becomes its own standalone appointment (no recurrence_rule)
// once sent to POST /api/calendar/appointments/bulk, so it's editable/
// deletable independently of every other generated occurrence, exactly
// like Plan Week (gig-plan-week.ts) and a manually created single shift.

export interface WeekdayPlan {
  selected: boolean;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  platforms: string[];
  earningsGoal: string; // raw form input; "" = no goal
  notes: string;
}

export interface MonthPlanOccurrence {
  date: string; // "YYYY-MM-DD"
  weekday: number;
  title: string;
  date_time: string;
  end_time: string;
  category: "work";
  status: "scheduled";
  gig_platforms: string[] | null;
  gig_earnings_goal: number | null;
  notes: string | null;
}

// `month` is an `<input type="month">` value ("YYYY-MM").
// `weekdayPlans` is indexed 0..6 by Date#getDay().
export function buildMonthPlanOccurrences(month: string, weekdayPlans: WeekdayPlan[], title: string): MonthPlanOccurrence[] {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  const occurrences: MonthPlanOccurrence[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const weekday = new Date(year, monthIndex, day).getDay();
    const plan = weekdayPlans[weekday];
    if (!plan?.selected || !plan.startTime || !plan.endTime) continue;

    const dateStr = `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
    const { start, end } = combineWorkScheduleTimes(dateStr, plan.startTime, plan.endTime);

    occurrences.push({
      date: dateStr,
      weekday,
      title,
      date_time: start,
      end_time: end,
      category: "work",
      status: "scheduled",
      gig_platforms: plan.platforms.length > 0 ? plan.platforms : null,
      gig_earnings_goal: plan.earningsGoal.trim() ? Number(plan.earningsGoal) : null,
      notes: plan.notes.trim() || null,
    });
  }

  return occurrences;
}

export interface MonthPlanTotals {
  totalHours: number;
  totalGoal: number;
  shiftCount: number;
}

export function computeMonthPlanTotals(occurrences: MonthPlanOccurrence[]): MonthPlanTotals {
  let totalHours = 0;
  let totalGoal = 0;

  for (const occurrence of occurrences) {
    totalHours += (new Date(occurrence.end_time).getTime() - new Date(occurrence.date_time).getTime()) / 3_600_000;
    if (occurrence.gig_earnings_goal != null) totalGoal += occurrence.gig_earnings_goal;
  }

  return { totalHours, totalGoal, shiftCount: occurrences.length };
}
