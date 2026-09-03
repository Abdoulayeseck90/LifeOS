import { RRule, type Options, type Weekday } from "rrule";

// Converts LifeOS's recurrence form state <-> an RFC 5545 RRULE string
// (no DTSTART/TZID embedded — the appointment's own date_time column is
// always the anchor, so the stored string is exactly the compact form
// the Calendar spec's own example shows: "FREQ=WEEKLY;BYDAY=MO,WE,FR").

export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly" | "custom";
export type RecurrenceEndType = "never" | "on_date" | "after_count";
export type MonthlyPattern = "same_day" | "first_weekday" | "last_weekday";
export type CustomUnit = "days" | "weeks" | "months" | "years";

export interface RecurrenceFormValue {
  frequency: RecurrenceFrequency;
  interval: number; // only meaningful for "custom"; every other frequency is always interval 1
  customUnit: CustomUnit; // only meaningful for "custom"
  weeklyDays: number[]; // JS getDay() convention (0=Sun..6=Sat); only meaningful for "weekly"
  monthlyPattern: MonthlyPattern; // only meaningful for "monthly"
  endType: RecurrenceEndType;
  endDate: string; // "YYYY-MM-DD"; only meaningful when endType is "on_date"
  endCount: number; // only meaningful when endType is "after_count"
}

export const DEFAULT_RECURRENCE_FORM_VALUE: RecurrenceFormValue = {
  frequency: "weekly",
  interval: 1,
  customUnit: "weeks",
  weeklyDays: [],
  monthlyPattern: "same_day",
  endType: "never",
  endDate: "",
  endCount: 10,
};

// rrule's Weekday objects number Monday=0..Sunday=6 internally — a
// different convention from JS Date.getDay() (Sunday=0..Saturday=6).
// One explicit table both directions go through, rather than either
// convention leaking into the rest of the app.
const JS_DAY_TO_RRULE_DAY: Weekday[] = [RRule.SU, RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA];
const RRULE_WEEKDAY_TO_JS_DAY: Record<number, number> = { 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 0 };
const WEEKDAY_STR_TO_JS_DAY: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

// value.weeklyDays/startDate.getDay() are always 0-6 in practice (JS
// Date's own contract), so the fallback here is unreachable defensive
// code rather than a real behavioral case.
function weekdayFor(jsDay: number): Weekday {
  return JS_DAY_TO_RRULE_DAY[jsDay] ?? RRule.MO;
}

const CUSTOM_UNIT_TO_FREQ: Record<CustomUnit, number> = {
  days: RRule.DAILY,
  weeks: RRule.WEEKLY,
  months: RRule.MONTHLY,
  years: RRule.YEARLY,
};
const FREQ_TO_CUSTOM_UNIT: Record<number, CustomUnit> = {
  [RRule.DAILY]: "days",
  [RRule.WEEKLY]: "weeks",
  [RRule.MONTHLY]: "months",
  [RRule.YEARLY]: "years",
};

// A date-only "on_date" end is inclusive of that whole day; UNTIL is
// compared against DTSTART's own timezone-less instant semantics in
// rrule, so anchoring to the end of that UTC day is what reliably keeps
// an occurrence scheduled for that same calendar day. `startDate`
// supplies the month/day for a plain yearly/monthly-same-day rule and
// the weekday for a first/last-weekday-of-month rule — both are exactly
// what RFC 5545 already infers from DTSTART, so nothing extra needs
// storing for those two common cases.
export function buildRecurrenceRule(value: RecurrenceFormValue, startDate: Date): string {
  const options: Partial<Options> = {};

  if (value.frequency === "daily") {
    options.freq = RRule.DAILY;
  } else if (value.frequency === "weekly") {
    options.freq = RRule.WEEKLY;
    if (value.weeklyDays.length > 0) {
      options.byweekday = value.weeklyDays.map(weekdayFor);
    }
  } else if (value.frequency === "monthly") {
    options.freq = RRule.MONTHLY;
    if (value.monthlyPattern === "first_weekday" || value.monthlyPattern === "last_weekday") {
      options.byweekday = [weekdayFor(startDate.getDay())];
      options.bysetpos = value.monthlyPattern === "first_weekday" ? 1 : -1;
    } else {
      options.bymonthday = [startDate.getDate()];
    }
  } else if (value.frequency === "yearly") {
    options.freq = RRule.YEARLY;
  } else {
    options.freq = CUSTOM_UNIT_TO_FREQ[value.customUnit];
    options.interval = Math.max(1, value.interval);
  }

  if (value.frequency !== "custom") {
    options.interval = 1;
  }

  if (value.endType === "on_date" && value.endDate) {
    options.until = new Date(`${value.endDate}T23:59:59Z`);
  } else if (value.endType === "after_count" && value.endCount > 0) {
    options.count = value.endCount;
  }

  // optionsToString() prepends "RRULE:" (the full iCalendar property
  // line form) — stripped here since the stored value is the bare rule
  // text, matching the compact example format ("FREQ=WEEKLY;BYDAY=...")
  // with no DTSTART/TZID embedded.
  return RRule.optionsToString(options).replace(/^RRULE:/, "");
}

// Reverse of buildRecurrenceRule — used to populate the form when
// editing an existing recurring appointment. Falls back to sensible
// defaults for anything the rule doesn't specify, and never throws on a
// rule this UI didn't itself generate (e.g. one written by hand) — it
// just renders as the closest supported approximation.
export function parseRecurrenceRule(rule: string, startDate: Date): RecurrenceFormValue {
  const options = RRule.parseString(rule);
  const result: RecurrenceFormValue = { ...DEFAULT_RECURRENCE_FORM_VALUE };

  if (options.until) {
    result.endType = "on_date";
    result.endDate = options.until.toISOString().slice(0, 10);
  } else if (options.count) {
    result.endType = "after_count";
    result.endCount = options.count;
  } else {
    result.endType = "never";
  }

  const byweekday = normalizeWeekdays(options.byweekday);

  if (options.freq === RRule.DAILY && (options.interval ?? 1) === 1) {
    result.frequency = "daily";
  } else if (options.freq === RRule.WEEKLY && (options.interval ?? 1) === 1) {
    result.frequency = "weekly";
    result.weeklyDays = byweekday.length > 0 ? byweekday : [startDate.getDay()];
  } else if (options.freq === RRule.MONTHLY && (options.interval ?? 1) === 1) {
    result.frequency = "monthly";
    if (options.bysetpos && byweekday.length > 0) {
      const pos = Array.isArray(options.bysetpos) ? options.bysetpos[0] : options.bysetpos;
      result.monthlyPattern = pos === -1 ? "last_weekday" : "first_weekday";
    } else {
      result.monthlyPattern = "same_day";
    }
  } else if (options.freq === RRule.YEARLY && (options.interval ?? 1) === 1) {
    result.frequency = "yearly";
  } else {
    result.frequency = "custom";
    result.customUnit = FREQ_TO_CUSTOM_UNIT[options.freq ?? RRule.WEEKLY] ?? "weeks";
    result.interval = options.interval ?? 1;
  }

  return result;
}

function normalizeWeekdays(byweekday: Options["byweekday"] | undefined): number[] {
  if (!byweekday) return [];
  const list = Array.isArray(byweekday) ? byweekday : [byweekday];
  return list.map((day) => {
    if (typeof day === "number") return RRULE_WEEKDAY_TO_JS_DAY[day] ?? 0;
    if (typeof day === "string") return WEEKDAY_STR_TO_JS_DAY[day] ?? 0;
    return RRULE_WEEKDAY_TO_JS_DAY[day.weekday] ?? 0;
  });
}
