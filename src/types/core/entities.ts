// Core entity types — Spec Section 6.1.
// These are hand-authored ground truth; database.ts (Supabase-generated)
// must structurally match these. Domain modules (Health, future Planning/
// Finance/etc.) import from here rather than redefining Project, Document,
// Task, etc. locally — see Spec Section 3, "Domain separation".

export type Locale = "en" | "fr";

// Notification Timing & Email Rules addendum: replaces the single
// email_reminders_enabled boolean with a per-category x per-channel x
// per-lead-time matrix (0011_notification_scheduling.sql). "monitoring"
// deliberately covers labs/imaging/medication checks together — those
// aren't distinct entities, just free-text categories on the same
// monitoring_items row, so splitting them into separate toggles would be
// fake granularity the data can't back.
export interface NotificationCategoryPreference {
  push: boolean;
  in_app: boolean;
  email: boolean;
}

export interface NotificationPreferences {
  appointments: NotificationCategoryPreference;
  monitoring: NotificationCategoryPreference;
  general_activity: NotificationCategoryPreference;
  bills: NotificationCategoryPreference;
  subscriptions: NotificationCategoryPreference;
  documents: NotificationCategoryPreference;
  dua: NotificationCategoryPreference;
  email_timing: {
    seven_day: boolean;
    three_day: boolean;
    one_day: boolean;
    day_of: boolean;
  };
  overdue_email_enabled: boolean;
  overdue_email_recurring: boolean;
}

export interface Profile {
  id: string; // matches auth.users.id
  user_id: string;
  display_name: string | null;
  preferred_language: Locale;
  two_factor_enabled: boolean;
  timezone: string; // IANA name, e.g. "America/Toronto" — see scheduling.ts
  notification_preferences: NotificationPreferences;
  created_at: string;
  updated_at: string;
}

// Planning & Business spec: status covers the "no separate Ideas page"
// requirement directly — an idea is just a Project with status "idea".
export type ProjectStatus = "idea" | "planning" | "active" | "completed" | "archived";

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: "low" | "medium" | "high" | null;
  start_date: string | null;
  target_date: string | null;
  completed_date: string | null;
  domain: "health" | "planning" | "finance" | "business" | "travel" | "assets" | null;
  tags: string[];
  category: string | null;
  notes: string | null;
  // Planning & Business spec, Section 13: a Project optionally belongs
  // to a Business — same row, never duplicated, just filtered by this
  // column when viewed from Planning -> Business -> X.
  business_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  name: string;
  type: string;
  category: string | null;
  storage_path: string;
  mime_type: string;
  file_size: number;
  document_date: string | null;
  provider: string | null;
  source: string | null;
  tags: string[];
  related_condition_id: string | null;
  related_appointment_id: string | null;
  related_lab_result_ids: string[];
  created_at: string;
  updated_at: string;
}

// DB keeps a 4th "cancelled" value for flexibility, but the Planning &
// Business spec's create/edit form only ever offers 3 statuses — To Do
// (open) / In Progress / Completed (done) — so TaskStatus stays the
// full DB union while the form/UI simply never surfaces "cancelled".
export type TaskStatus = "open" | "in_progress" | "done" | "cancelled";

export interface TaskRecord {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: "low" | "medium" | "high" | null;
  due_date: string | null;
  project_id: string | null;
  goal_id: string | null;
  business_id: string | null;
  domain: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventRecord {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

export type GoalStatus = "not_started" | "in_progress" | "completed" | "archived";

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: GoalStatus;
  target_date: string | null;
  category: string | null;
  // 0-100, user-entered — LifeOS never infers this from linked task
  // completion (a goal can be worked toward without every step being a
  // tracked task).
  progress: number;
  project_id: string | null;
  business_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  folder: string | null;
  tags: string[];
  // Doubles as Notes' optional "Category" field (Health/Planning/
  // Finance/Business/Personal/General) — no separate category column.
  related_domain: string | null;
  related_project_id: string | null;
  related_appointment_id: string | null;
  related_condition_id: string | null;
  related_goal_id: string | null;
  related_business_id: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export type BusinessStatus = "idea" | "planning" | "active" | "paused" | "completed" | "archived";

// Planning & Business spec, Section 9: Business is a lightweight
// context inside Planning, not a parallel system — it has its own
// identity/status record here, but projects/goals/tasks/notes/finance
// transactions attach to it via an optional business_id rather than
// Business owning duplicate copies of any of those.
export interface Business {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: string | null;
  status: BusinessStatus;
  start_date: string | null;
  website: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type FinanceTransactionType = "income" | "expense";

// Income and Expenses share this one table (Finance spec, Section 22:
// "Do NOT duplicate Finance transactions") — `type` distinguishes them.
// business_id/project_id are optional so the SAME transaction is
// visible from Finance -> Expenses and Planning -> Business -> X ->
// Finances (Section 17).
export interface FinanceTransaction {
  id: string;
  user_id: string;
  type: FinanceTransactionType;
  // Income's "Source" and Expense's "Description" both live here.
  description: string;
  amount: number;
  date: string;
  category: string;
  payment_method: string | null;
  is_recurring: boolean;
  business_id: string | null;
  project_id: string | null;
  // Set when this transaction was created by a Bill's "Mark as Paid"
  // action — that action creates exactly one transaction row and
  // records it here and on the bill, so it can never duplicate.
  bill_id: string | null;
  // Set when this transaction was created by a Subscription's "Record
  // Charge" action. Unlike bill_id, a subscription legitimately
  // produces a new transaction every billing cycle — this links each
  // one back to its subscription without implying only one may exist.
  subscription_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Credit & Loans spec — every payoff/interest/utilization figure is
// computed live from these stored fields via
// src/lib/finance/amortization.ts, never stored redundantly here.
export interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  balance: number;
  credit_limit: number;
  apr: number;
  minimum_payment: number | null;
  current_payment: number | null;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type LoanPaymentFrequency = "weekly" | "biweekly" | "monthly";

export interface Loan {
  id: string;
  user_id: string;
  name: string;
  original_amount: number;
  balance: number;
  apr: number;
  minimum_payment: number | null;
  payment_frequency: LoanPaymentFrequency | null;
  remaining_term_months: number | null;
  next_payment_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type BillFrequency = "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
// pending/paid/cancelled are the only STORED states — upcoming/due
// today/overdue are display states derived from due_date vs today at
// render time (same pattern as Health's monitoring display status),
// never stored redundantly.
export type BillStatus = "pending" | "paid" | "cancelled";

// A Bill is money the user is EXPECTED to pay, distinct from an
// Expense (money actually spent). Marking a bill paid creates exactly
// one finance_transactions row and records its id here
// (linked_transaction_id) so a second "Mark as Paid" can never create
// a duplicate Expense. A recurring bill's due_date advances and status
// resets to "pending" on payment — the row itself is the recurring
// template, never duplicated.
export interface Bill {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_date: string;
  category: string | null;
  is_recurring: boolean;
  frequency: BillFrequency | null;
  auto_pay: boolean;
  payment_method: string | null;
  business_id: string | null;
  status: BillStatus;
  paid_at: string | null;
  linked_transaction_id: string | null;
  reminders_enabled: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type SubscriptionBillingFrequency = "weekly" | "monthly" | "quarterly" | "yearly";
export type SubscriptionStatus = "active" | "paused" | "cancelled";

// A Subscription is a recurring service definition — distinct from the
// Expense each billing cycle actually produces. "Record Charge" creates
// one finance_transactions row (subscription_id-linked) and advances
// next_billing_date; unlike Bill.linked_transaction_id there is no
// single link back here, since a subscription legitimately produces a
// new Expense every cycle rather than one payment to guard against
// repeating.
export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  billing_frequency: SubscriptionBillingFrequency;
  next_billing_date: string;
  category: string | null;
  payment_method: string | null;
  auto_renewal: boolean;
  website: string | null;
  status: SubscriptionStatus;
  reminders_enabled: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type PersonalDocumentType =
  | "personal_document"
  | "receipt"
  | "certificate"
  | "contract"
  | "identification"
  | "financial_document"
  | "insurance_document"
  | "employment_document"
  | "military_document"
  | "education_document"
  | "other";

// Deliberately separate from Health's Document (Medical Documents) —
// different shape, different Storage bucket, never queried together
// (Section 64: "Do NOT place Personal Documents inside Health"). Receipt
// is one document_type here, not a separate table/module — merchant/
// amount/purchase_date/payment_method/related_expense_id are nullable
// and only populated when document_type is "receipt" (Section 72).
// related_expense_id is a one-directional link to the real financial
// transaction: the Receipt is supporting documentation, the Expense is
// the transaction, and Finance sums only the Expense (Section 71).
export interface PersonalDocument {
  id: string;
  user_id: string;
  name: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  document_type: PersonalDocumentType;
  category: string | null;
  description: string | null;
  tags: string[];
  expiration_date: string | null;
  reminders_enabled: boolean;
  reminder_lead_days: number | null;
  pinned: boolean;
  notes: string | null;
  merchant: string | null;
  amount: number | null;
  purchase_date: string | null;
  payment_method: string | null;
  related_expense_id: string | null;
  created_at: string;
  updated_at: string;
}

// Union of Section 3's built-in time/context taxonomy and Section 8's
// personal-Dua organizational categories — both are stored in this one
// column since built-in and personal Duas are rows in the same table.
// "work"/"business"/"finance"/"marriage"/"goals" only ever come from a
// personal Dua; the UI shows each list's own subset where appropriate
// (dua-form.tsx uses Section 8's list, dua-category-chips.tsx uses
// Section 18's filter list).
export type DuaCategory =
  | "morning"
  | "evening"
  | "before_sleep"
  | "after_waking"
  | "before_eating"
  | "after_eating"
  | "leaving_home"
  | "entering_home"
  | "travel"
  | "protection"
  | "forgiveness"
  | "guidance"
  | "gratitude"
  | "rizq"
  | "family"
  | "health"
  | "difficulty_stress"
  | "personal"
  | "other"
  | "work"
  | "business"
  | "finance"
  | "marriage"
  | "goals";

export type DuaSourceType = "quran" | "hadith" | "adhkar_collection" | "other";
export type DuaVerificationStatus = "verified" | "needs_verification";

// Shared library content — the one table with no user_id: a built-in row
// (is_builtin true, created_by null) isn't owned by anyone, it's shared
// across every user. A personal Dua (is_builtin false, created_by set)
// is visible only to its creator, enforced by split RLS (see migration
// 0041) not just by this type. Never invent verification_status
// "verified" client-side — it only ever reflects what's actually stored.
export interface Dua {
  id: string;
  title: string;
  arabic_text: string | null;
  transliteration: string | null;
  translation: string | null;
  meaning: string | null;
  category: DuaCategory;
  recommended_time: string | null;
  frequency: string | null;
  source_name: string | null;
  source_reference: string | null;
  source_type: DuaSourceType | null;
  source_url: string | null;
  verification_status: DuaVerificationStatus;
  is_builtin: boolean;
  created_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type DuaScheduleType = "morning" | "evening" | "before_sleep" | "daily" | "custom";

// Which Duas are in the user's personal routine and under which named
// block — never duplicates the Dua itself (Section 9).
export interface UserDuaRoutine {
  id: string;
  user_id: string;
  dua_id: string;
  schedule_type: DuaScheduleType;
  sort_order: number;
  active: boolean;
  created_at: string;
}

// Joined shape returned by listUserDuaRoutines() via Supabase's embedded
// resource select (.select("*, duas(*)")) — the routine item plus its
// Dua content in one query.
export interface UserDuaRoutineWithDua extends UserDuaRoutine {
  duas: Dua;
}

// One reminder time per named block (Section 14) — not per individual
// Dua. "custom" routines never get a reminder setting of their own.
export type DuaReminderScheduleType = "morning" | "evening" | "before_sleep";

export interface DuaReminderSetting {
  id: string;
  user_id: string;
  schedule_type: DuaReminderScheduleType;
  enabled: boolean;
  time_of_day: string;
  created_at: string;
  updated_at: string;
}

// Idempotent daily completion (Section 26) — "today's checklist" is a
// derived query against this table for today's date, never a stored,
// resettable state.
export interface DuaCompletion {
  id: string;
  user_id: string;
  dua_id: string;
  routine_id: string;
  completed_date: string;
  completed_at: string;
}

// A user's private favorite/notes overlay on a shared Dua (merges
// Sections 19+20) — never visible to, or influenced by, any other user.
export interface DuaUserData {
  id: string;
  user_id: string;
  dua_id: string;
  favorited: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  category: string;
  title: string;
  body: string | null;
  read: boolean;
  scheduled_for: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  created_at: string;
  updated_at: string;
}

// One row per browser/device Push subscription (0017_push_notifications.sql)
// — a user can have several at once (phone, desktop, tablet), never just
// one. p256dh/auth_key are the Push API subscription's public encryption
// keys (not secrets on their own — they're only useful paired with the
// server's VAPID private key, which never leaves src/lib/push/web-push.ts).
export type PushSubscriptionStatus = "active" | "inactive";

export interface PushSubscriptionRecord {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
  device_label: string | null;
  user_agent: string | null;
  status: PushSubscriptionStatus;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

// Generic reminder engine (Spec Addendum Section 12) — deliberately not
// Health-specific in table or field names, so Tasks/Projects/other
// domains can reuse it later. Rows are system-generated today (by the
// monitoring API routes); a user-facing "configure reminders" UI is a
// later step. Firing a reminder writes one Notification row for in-app
// display (see services/core/reminders.ts, processDueReminders).
export type ReminderDeliveryChannel = "in_app" | "email" | "push";
// 'delivered' is schema-ready for a future Resend delivery-webhook
// integration — not written by anything yet (see email.ts comment on
// ResendEmailSender.send). Today's real outcomes are 'sent' or 'failed'.
export type ReminderStatus = "pending" | "sent" | "delivered" | "failed" | "cancelled";
// Which pre-due-date offset (or 'overdue', past the due date) this
// reminder represents — 'custom' is the pre-migration default for rows
// that predate this bucket scheme.
export type LeadTimeBucket = "seven_day" | "three_day" | "one_day" | "day_of" | "overdue" | "custom";

export interface Reminder {
  id: string;
  user_id: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  delivery_channel: ReminderDeliveryChannel;
  lead_time_days: number;
  lead_time_bucket: LeadTimeBucket;
  // Idempotency key: "{entityType}:{entityId}:{bucket}:{channel}" (see
  // scheduling.ts buildReminderKey) — unique per user, enforced by a
  // partial index, so the same reminder can never be scheduled twice.
  reminder_key: string | null;
  scheduled_for: string;
  title: string;
  body: string | null;
  status: ReminderStatus;
  sent_at: string | null;
  failure_reason: string | null;
  notification_id: string | null;
  created_at: string;
  updated_at: string;
}

// entity_type identifies which table entity_id points into. Because this
// is a polymorphic reference (no real FK), enforcement is via a trigger —
// see supabase/migrations/0003_audit_and_timeline.sql — never assume the
// database will catch an invalid pairing on its own; validate at the
// service layer too (src/services/core/timeline.ts).
export interface TimelineEvent {
  id: string;
  user_id: string;
  event_type: string;
  date_time: string;
  title: string;
  description: string | null;
  domain: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  source_document_id: string | null;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  user_id: string;
  actor: string;
  action: "create" | "update" | "delete";
  entity_type: string;
  entity_id: string;
  timestamp: string;
  metadata: Record<string, unknown> | null;
}
