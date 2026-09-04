import { z } from "zod";
import { RRule } from "rrule";

// Server-side validation per Spec Section 30 — same pattern as
// src/lib/validation/health.ts.

// Mirrors NotificationPreferences (types/core/entities.ts) exactly — the
// Settings form always PATCHes the whole object (a plain column update
// replaces the jsonb value wholesale, no partial merge), so this is
// intentionally not itself .partial().
const notificationCategoryPreferenceSchema = z.object({
  push: z.boolean(),
  in_app: z.boolean(),
  email: z.boolean(),
});

export const notificationPreferencesSchema = z.object({
  appointments: notificationCategoryPreferenceSchema,
  monitoring: notificationCategoryPreferenceSchema,
  general_activity: notificationCategoryPreferenceSchema,
  bills: notificationCategoryPreferenceSchema,
  subscriptions: notificationCategoryPreferenceSchema,
  documents: notificationCategoryPreferenceSchema,
  dua: notificationCategoryPreferenceSchema,
  email_timing: z.object({
    seven_day: z.boolean(),
    three_day: z.boolean(),
    one_day: z.boolean(),
    day_of: z.boolean(),
  }),
  overdue_email_enabled: z.boolean(),
  overdue_email_recurring: z.boolean(),
});

// two_factor_enabled is deliberately not client-settable here — it's
// derived server-side from actual Supabase MFA factor state
// (syncTwoFactorStatus in services/core/profile.ts) so the flag can't
// drift from reality via a client PATCH.
export const profileInputSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  preferred_language: z.enum(["en", "fr"]).optional(),
  timezone: z.string().min(1).optional(),
  notification_preferences: notificationPreferencesSchema.optional(),
});

export type ProfileInput = z.infer<typeof profileInputSchema>;

// POST /api/push/subscribe body — mirrors the browser's own
// PushSubscription.toJSON() shape exactly, so the client can forward it
// with no reshaping.
export const pushSubscriptionInputSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  device_label: z.string().max(100).optional(),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionInputSchema>;

export const pushUnsubscribeInputSchema = z.object({
  endpoint: z.string().url(),
});

// Planning & Business spec — every field optional except the one
// identifying field, same "log the simple thing fast, details behind
// More" philosophy as the Health module's forms.

export const projectInputSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  status: z.enum(["idea", "planning", "active", "completed", "archived"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  start_date: z.string().date().optional(),
  target_date: z.string().date().optional(),
  completed_date: z.string().date().optional(),
  category: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
  business_id: z.string().uuid().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});
export const projectUpdateSchema = projectInputSchema.partial();
export type ProjectInput = z.infer<typeof projectInputSchema>;

export const goalInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  status: z.enum(["not_started", "in_progress", "completed", "archived"]).optional(),
  target_date: z.string().date().optional(),
  category: z.string().max(100).optional(),
  progress: z.number().min(0).max(100).optional(),
  project_id: z.string().uuid().optional(),
  business_id: z.string().uuid().optional(),
});
export const goalUpdateSchema = goalInputSchema.partial();
export type GoalInput = z.infer<typeof goalInputSchema>;

export const taskInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  status: z.enum(["open", "in_progress", "done", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  due_date: z.string().date().optional(),
  project_id: z.string().uuid().optional(),
  goal_id: z.string().uuid().optional(),
  business_id: z.string().uuid().optional(),
  notes: z.string().max(5000).optional(),
});
export const taskUpdateSchema = taskInputSchema.partial();
export type TaskInput = z.infer<typeof taskInputSchema>;

export const businessInputSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  category: z.string().max(100).optional(),
  status: z.enum(["idea", "planning", "active", "paused", "completed", "archived"]).optional(),
  start_date: z.string().date().optional(),
  website: z.string().max(300).optional(),
  notes: z.string().max(5000).optional(),
});
export const businessUpdateSchema = businessInputSchema.partial();
export type BusinessInput = z.infer<typeof businessInputSchema>;

export const noteInputSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().max(20000).default(""),
  folder: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  related_domain: z.enum(["health", "planning", "finance", "business", "personal", "general"]).optional(),
  related_project_id: z.string().uuid().optional(),
  related_goal_id: z.string().uuid().optional(),
  related_business_id: z.string().uuid().optional(),
  pinned: z.boolean().optional(),
});
export const noteUpdateSchema = noteInputSchema.partial();
export type NoteInput = z.infer<typeof noteInputSchema>;

// Finance spec — Income/Expenses share one table; category is plain
// text (the allow-list of suggested categories lives in the UI layer,
// per Section 21's "allow custom categories if appropriate").
export const financeTransactionInputSchema = z.object({
  type: z.enum(["income", "expense"]),
  description: z.string().min(1).max(200),
  amount: z.number().positive().finite(),
  date: z.string().date().optional(),
  category: z.string().min(1).max(100),
  payment_method: z.string().max(100).optional(),
  is_recurring: z.boolean().optional(),
  business_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  bill_id: z.string().uuid().optional(),
  subscription_id: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
});
export const financeTransactionUpdateSchema = financeTransactionInputSchema.partial();
export type FinanceTransactionInput = z.infer<typeof financeTransactionInputSchema>;

// Bills spec — a Bill is money expected to be paid, not the payment
// itself. status/paid_at/linked_transaction_id are set by the service
// layer's payBill()/cancelBill(), never accepted directly from a form.
export const billInputSchema = z.object({
  name: z.string().min(1).max(200),
  amount: z.number().positive().finite(),
  due_date: z.string().date(),
  category: z.string().max(100).optional(),
  is_recurring: z.boolean().optional(),
  frequency: z.enum(["weekly", "monthly", "quarterly", "yearly", "custom"]).optional(),
  auto_pay: z.boolean().optional(),
  payment_method: z.string().max(100).optional(),
  business_id: z.string().uuid().optional(),
  // At most one of these two may be set — enforced again at the
  // database level (bills_single_debt_link) since a client could always
  // send both regardless of what the form does.
  linked_credit_card_id: z.string().uuid().optional(),
  linked_loan_id: z.string().uuid().optional(),
  reminders_enabled: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
}).refine((data) => !(data.linked_credit_card_id && data.linked_loan_id), {
  message: "A bill cannot be linked to both a credit card and a loan.",
  path: ["linked_credit_card_id"],
});
// billInputSchema.partial() would lose the refine() above and wouldn't
// allow explicitly clearing a link back to null (switching a bill from
// "Credit Card Payment" back to "Regular Bill") — extended from the
// plain partial with just those two fields made nullable, everything
// else keeps its exact prior partial()-derived shape.
export const billUpdateSchema = billInputSchema
  .innerType()
  .partial()
  .extend({
    linked_credit_card_id: z.string().uuid().nullable().optional(),
    linked_loan_id: z.string().uuid().nullable().optional(),
  })
  .refine((data) => !(data.linked_credit_card_id && data.linked_loan_id), {
    message: "A bill cannot be linked to both a credit card and a loan.",
    path: ["linked_credit_card_id"],
  });
export type BillInput = z.infer<typeof billInputSchema>;
export type BillUpdateInput = z.infer<typeof billUpdateSchema>;

export const payBillInputSchema = z.object({
  paid_date: z.string().date().optional(),
  amount: z.number().positive().finite().optional(),
});
export type PayBillInput = z.infer<typeof payBillInputSchema>;

// Subscriptions spec — a Subscription is a recurring service
// definition, not a payment itself. status is set by dedicated
// pause/resume/cancel actions and next_billing_date is advanced by
// "Record Charge", never accepted directly from this form.
export const subscriptionInputSchema = z.object({
  name: z.string().min(1).max(200),
  amount: z.number().positive().finite(),
  billing_frequency: z.enum(["weekly", "monthly", "quarterly", "yearly"]),
  next_billing_date: z.string().date(),
  category: z.string().max(100).optional(),
  payment_method: z.string().max(100).optional(),
  auto_renewal: z.boolean().optional(),
  website: z.string().max(300).optional(),
  reminders_enabled: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});
export const subscriptionUpdateSchema = subscriptionInputSchema.partial().extend({
  status: z.enum(["active", "paused", "cancelled"]).optional(),
});
export type SubscriptionInput = z.infer<typeof subscriptionInputSchema>;

export const recordSubscriptionChargeInputSchema = z.object({
  charge_date: z.string().date().optional(),
  amount: z.number().positive().finite().optional(),
});
export type RecordSubscriptionChargeInput = z.infer<typeof recordSubscriptionChargeInputSchema>;

const PERSONAL_DOCUMENT_TYPES = [
  "personal_document",
  "receipt",
  "certificate",
  "contract",
  "identification",
  "financial_document",
  "insurance_document",
  "employment_document",
  "military_document",
  "education_document",
  "other",
] as const;

// Documents spec, Section 69/72: metadata only — the file itself is
// uploaded directly to the personal-documents Storage bucket from the
// browser before this ever runs (mirrors documentInputSchema/
// receipt-specific fields are all optional here rather than split into
// a second schema — Section 72: "Do not force receipt-specific fields
// onto normal documents" is enforced by the UI only showing them when
// document_type is "receipt", not by the schema shape).
export const personalDocumentInputSchema = z.object({
  name: z.string().min(1).max(200),
  storage_path: z.string().min(1),
  mime_type: z.string().min(1),
  file_size: z.number().int().nonnegative(),
  document_type: z.enum(PERSONAL_DOCUMENT_TYPES).optional(),
  category: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  expiration_date: z.string().date().optional(),
  reminders_enabled: z.boolean().optional(),
  reminder_lead_days: z.number().int().positive().optional(),
  notes: z.string().max(2000).optional(),
  merchant: z.string().max(200).optional(),
  amount: z.number().positive().finite().optional(),
  purchase_date: z.string().date().optional(),
  payment_method: z.string().max(100).optional(),
  related_expense_id: z.string().uuid().optional(),
  related_gig_expense_id: z.string().uuid().optional(),
  related_gig_maintenance_id: z.string().uuid().optional(),
});
export type PersonalDocumentInput = z.infer<typeof personalDocumentInputSchema>;

// The file is fixed at upload time (same reasoning as Health documents)
// — only metadata can change afterward. pinned is toggled through this
// same PATCH (a dedicated Pin action just sends { pinned: true/false }).
export const personalDocumentUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  document_type: z.enum(PERSONAL_DOCUMENT_TYPES).optional(),
  category: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  expiration_date: z.string().date().nullable().optional(),
  reminders_enabled: z.boolean().optional(),
  reminder_lead_days: z.number().int().positive().nullable().optional(),
  pinned: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
  merchant: z.string().max(200).optional(),
  amount: z.number().positive().finite().optional(),
  purchase_date: z.string().date().optional(),
  payment_method: z.string().max(100).optional(),
  related_expense_id: z.string().uuid().nullable().optional(),
  related_gig_expense_id: z.string().uuid().nullable().optional(),
  related_gig_maintenance_id: z.string().uuid().nullable().optional(),
});
export type PersonalDocumentUpdateInput = z.infer<typeof personalDocumentUpdateSchema>;

// Credit & Loans spec, Section 25/26 — only name/balance/limit/APR (or
// original_amount for loans) are required; every payment/date field is
// optional so a card can be tracked even before every detail is known.
export const creditCardInputSchema = z.object({
  name: z.string().min(1).max(200),
  balance: z.number().nonnegative().finite(),
  credit_limit: z.number().positive().finite(),
  apr: z.number().nonnegative().finite(),
  minimum_payment: z.number().nonnegative().finite().optional(),
  current_payment: z.number().nonnegative().finite().optional(),
  due_date: z.string().date().optional(),
  notes: z.string().max(2000).optional(),
});
export const creditCardUpdateSchema = creditCardInputSchema.partial();
export type CreditCardInput = z.infer<typeof creditCardInputSchema>;

export const loanInputSchema = z.object({
  name: z.string().min(1).max(200),
  original_amount: z.number().positive().finite(),
  balance: z.number().nonnegative().finite(),
  apr: z.number().nonnegative().finite(),
  minimum_payment: z.number().nonnegative().finite().optional(),
  payment_frequency: z.enum(["weekly", "biweekly", "monthly"]).optional(),
  remaining_term_months: z.number().int().nonnegative().optional(),
  next_payment_date: z.string().date().optional(),
  notes: z.string().max(2000).optional(),
});
export const loanUpdateSchema = loanInputSchema.partial();
export type LoanInput = z.infer<typeof loanInputSchema>;

const DUA_CATEGORIES = [
  "morning",
  "evening",
  "before_sleep",
  "after_waking",
  "before_eating",
  "after_eating",
  "leaving_home",
  "entering_home",
  "travel",
  "protection",
  "forgiveness",
  "guidance",
  "gratitude",
  "rizq",
  "family",
  "health",
  "difficulty_stress",
  "personal",
  "other",
  "work",
  "business",
  "finance",
  "marriage",
  "goals",
] as const;

// Faith/Dua spec, Section 7/24: this is the PERSONAL-Dua creation path
// only — is_builtin/created_by/verification_status are always set by the
// service layer (createDua), never accepted from a client. RLS is the
// real enforcement that a request can never create or edit built-in
// content (Section 24); this schema shape just matches what a personal
// Dua form actually needs, no Arabic required (Section 7).
export const duaInputSchema = z.object({
  title: z.string().min(1).max(200),
  arabic_text: z.string().max(2000).optional(),
  transliteration: z.string().max(2000).optional(),
  translation: z.string().max(2000).optional(),
  meaning: z.string().max(2000).optional(),
  category: z.enum(DUA_CATEGORIES).optional(),
  notes: z.string().max(2000).optional(),
});
export const duaUpdateSchema = duaInputSchema.partial();
export type DuaInput = z.infer<typeof duaInputSchema>;

const DUA_SCHEDULE_TYPES = ["morning", "evening", "before_sleep", "daily", "custom"] as const;

export const duaRoutineInputSchema = z.object({
  dua_id: z.string().uuid(),
  schedule_type: z.enum(DUA_SCHEDULE_TYPES),
});
export type DuaRoutineInput = z.infer<typeof duaRoutineInputSchema>;

export const duaCompletionToggleSchema = z.object({
  routine_id: z.string().uuid(),
  dua_id: z.string().uuid(),
});
export type DuaCompletionToggleInput = z.infer<typeof duaCompletionToggleSchema>;

// One reminder time per named block (Section 14) — "custom" routines
// never get a reminder setting of their own.
export const duaReminderSettingUpdateSchema = z.object({
  schedule_type: z.enum(["morning", "evening", "before_sleep"]),
  enabled: z.boolean(),
  time_of_day: z.string().regex(/^\d{2}:\d{2}$/),
});
export type DuaReminderSettingUpdateInput = z.infer<typeof duaReminderSettingUpdateSchema>;

export const duaUserDataUpdateSchema = z.object({
  favorited: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});
export type DuaUserDataUpdateInput = z.infer<typeof duaUserDataUpdateSchema>;

// Appointments moved here from validation/health.ts — Calendar spec:
// appointments are now a global Calendar feature, not Health-specific.
// title/provider_name: at least one required (mirrors the
// appointments_has_label DB check constraint) — every pre-existing
// medical appointment has provider_name; new non-medical ones use
// title instead. recurrence_rule is validated as a real, parseable
// RFC 5545 rule before it ever reaches the database — a malformed rule
// here would otherwise surface much later as a silently-empty calendar
// (generateOccurrences() swallows a parse failure per-row so one bad
// rule can't break the whole page) rather than a clear save-time error.
const appointmentCategorySchema = z.enum(["medical", "work", "personal", "financial", "travel", "other"]);

export const appointmentInputSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    provider_name: z.string().min(1).max(200).optional(),
    specialty: z.string().optional(),
    appointment_type: z.string().optional(),
    date_time: z.string().datetime().or(z.string().min(1)),
    // Nullable (not just optional): the client always sends an explicit
    // value for these four — null when clearing/leaving unset, a real
    // value otherwise — rather than omitting the key, so create (this
    // schema) and update (appointmentUpdateSchema below) both need to
    // accept null, not just undefined.
    end_time: z.string().datetime().or(z.string().min(1)).nullable().optional(),
    location: z.string().optional(),
    category: appointmentCategorySchema.default("medical"),
    status: z.enum(["scheduled", "completed", "cancelled", "no_show"]).default("scheduled"),
    preparation_notes: z.string().optional(),
    clinician_instructions: z.string().optional(),
    follow_up_date: z.string().date().optional(),
    related_condition_id: z.string().uuid().nullable().optional(),
    notes: z.string().optional(),
    // Gig Driving spec: facets for category="work" schedule items only —
    // nullable/optional so every other category's appointments (which
    // never set these) round-trip unaffected.
    gig_platforms: z.array(z.enum(["doordash", "ubereats", "spark", "other"])).nullable().optional(),
    gig_earnings_goal: z.number().nonnegative().nullable().optional(),
    reminder_lead_minutes: z.number().int().positive().nullable().optional(),
    recurrence_rule: z
      .string()
      .refine((rule) => {
        try {
          RRule.parseString(rule);
          return true;
        } catch {
          return false;
        }
      }, "Invalid recurrence rule")
      .nullable()
      .optional(),
  })
  .refine((data) => Boolean(data.title || data.provider_name), {
    message: "Please provide a title.",
    path: ["title"],
  });

export type AppointmentInput = z.infer<typeof appointmentInputSchema>;

const appointmentScopeSchema = z.enum(["series", "this", "following"]);

// PATCH: every field optional (an edit may touch just one field — the
// base schema's end_time/related_condition_id/reminder_lead_minutes/
// recurrence_rule are already nullable, so .partial() keeps them
// nullable-and-optional here too, letting the client explicitly clear
// one with a real `null` distinct from simply not touching it), plus
// the edit-scope fields the Calendar spec requires — occurrence_start
// identifies which generated occurrence "this"/"following" applies to,
// required for those two scopes and meaningless for "series".
export const appointmentUpdateSchema = appointmentInputSchema
  .innerType()
  .partial()
  .extend({
    scope: appointmentScopeSchema.default("series"),
    occurrence_start: z.string().datetime().optional(),
  })
  .refine((data) => data.scope === "series" || Boolean(data.occurrence_start), {
    message: "occurrence_start is required for this/following scope.",
    path: ["occurrence_start"],
  });

export type AppointmentUpdateInput = z.infer<typeof appointmentUpdateSchema>;

export const appointmentDeleteSchema = z
  .object({
    scope: appointmentScopeSchema.default("series"),
    occurrence_start: z.string().datetime().optional(),
  })
  .refine((data) => data.scope === "series" || Boolean(data.occurrence_start), {
    message: "occurrence_start is required for this/following scope.",
    path: ["occurrence_start"],
  });

export type AppointmentDeleteInput = z.infer<typeof appointmentDeleteSchema>;
