import type { NotificationPreferences, NotificationCategoryPreference } from "@/types/core/entities";

// Single canonical source for what a "complete" notification_preferences
// value looks like — the 5 confirmed categories (appointments,
// monitoring, general_activity, bills, subscriptions) and nothing else.
// Labs/imaging/medication monitoring stay folded into "monitoring" (no
// separate categories — there's no structured field to split them on).
// Push + In-App are the primary channels (ON by default); Email is
// optional (OFF by default for every category) — see
// 0017_push_notifications.sql.
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  appointments: { push: true, in_app: true, email: false },
  monitoring: { push: true, in_app: true, email: false },
  general_activity: { push: true, in_app: true, email: false },
  bills: { push: true, in_app: true, email: false },
  subscriptions: { push: true, in_app: true, email: false },
  documents: { push: true, in_app: true, email: false },
  dua: { push: true, in_app: true, email: false },
  email_timing: { seven_day: true, three_day: true, one_day: true, day_of: false },
  overdue_email_enabled: true,
  overdue_email_recurring: false,
};

export const NOTIFICATION_CATEGORIES = [
  "appointments",
  "monitoring",
  "general_activity",
  "bills",
  "subscriptions",
  "documents",
  "dua",
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function mergeCategoryPreference(
  fallback: NotificationCategoryPreference,
  raw: unknown
): NotificationCategoryPreference {
  const r = isRecord(raw) ? raw : {};
  return {
    push: typeof r.push === "boolean" ? r.push : fallback.push,
    in_app: typeof r.in_app === "boolean" ? r.in_app : fallback.in_app,
    email: typeof r.email === "boolean" ? r.email : fallback.email,
  };
}

// The one place that turns "whatever Supabase actually returned" (which
// might be null/undefined — column not migrated yet on this row/DB —
// or an old/partial shape from before a category existed) into a
// guaranteed-complete NotificationPreferences. Every caller downstream
// (API routes, Settings UI) can then read prefs.appointments.in_app etc.
// without a single optional-chaining guard, because by the time they see
// it, it's real — not because the access site is defensively hedged.
export function mergeNotificationPreferences(raw: unknown): NotificationPreferences {
  const r = isRecord(raw) ? raw : {};

  return {
    appointments: mergeCategoryPreference(DEFAULT_NOTIFICATION_PREFERENCES.appointments, r.appointments),
    monitoring: mergeCategoryPreference(DEFAULT_NOTIFICATION_PREFERENCES.monitoring, r.monitoring),
    general_activity: mergeCategoryPreference(DEFAULT_NOTIFICATION_PREFERENCES.general_activity, r.general_activity),
    bills: mergeCategoryPreference(DEFAULT_NOTIFICATION_PREFERENCES.bills, r.bills),
    subscriptions: mergeCategoryPreference(DEFAULT_NOTIFICATION_PREFERENCES.subscriptions, r.subscriptions),
    documents: mergeCategoryPreference(DEFAULT_NOTIFICATION_PREFERENCES.documents, r.documents),
    dua: mergeCategoryPreference(DEFAULT_NOTIFICATION_PREFERENCES.dua, r.dua),
    email_timing: {
      seven_day:
        isRecord(r.email_timing) && typeof r.email_timing.seven_day === "boolean"
          ? r.email_timing.seven_day
          : DEFAULT_NOTIFICATION_PREFERENCES.email_timing.seven_day,
      three_day:
        isRecord(r.email_timing) && typeof r.email_timing.three_day === "boolean"
          ? r.email_timing.three_day
          : DEFAULT_NOTIFICATION_PREFERENCES.email_timing.three_day,
      one_day:
        isRecord(r.email_timing) && typeof r.email_timing.one_day === "boolean"
          ? r.email_timing.one_day
          : DEFAULT_NOTIFICATION_PREFERENCES.email_timing.one_day,
      day_of:
        isRecord(r.email_timing) && typeof r.email_timing.day_of === "boolean"
          ? r.email_timing.day_of
          : DEFAULT_NOTIFICATION_PREFERENCES.email_timing.day_of,
    },
    overdue_email_enabled:
      typeof r.overdue_email_enabled === "boolean"
        ? r.overdue_email_enabled
        : DEFAULT_NOTIFICATION_PREFERENCES.overdue_email_enabled,
    overdue_email_recurring:
      typeof r.overdue_email_recurring === "boolean"
        ? r.overdue_email_recurring
        : DEFAULT_NOTIFICATION_PREFERENCES.overdue_email_recurring,
  };
}
