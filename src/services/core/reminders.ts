import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { format, addDays } from "date-fns";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { Reminder, ReminderDeliveryChannel, LeadTimeBucket, NotificationCategoryPreference } from "@/types/core/entities";
import { getEmailSender, buildReminderEmail } from "@/services/core/email";
import { getProfile } from "@/services/core/profile";
import { computeScheduledFor, computeScheduledForMinutesBefore, buildReminderKey, LEAD_DAYS_BY_BUCKET } from "@/lib/notifications/scheduling";
import { listMonitoringItems } from "@/services/health/monitoring";
import { listAppointments } from "@/services/core/appointments";
import { generateOccurrences } from "@/lib/calendar/recurrence";
import type { Appointment } from "@/types/health/entities";
import { listBills } from "@/services/core/bills";
import { listSubscriptions } from "@/services/core/subscriptions";
import { listPersonalDocuments } from "@/services/core/personal-documents";
import { listDuaReminderSettings } from "@/services/core/dua-reminder-settings";
import { sendPushNotification, isSubscriptionGone, isPushConfigured } from "@/lib/push/web-push";
import { buildPushPayload } from "@/lib/push/content";
import { listActivePushSubscriptionsForUser, deactivatePushSubscriptionById } from "@/services/core/push-subscriptions";

// Generic reminder engine — see the Reminder type comment and
// 0009_reminders.sql / 0011_notification_scheduling.sql for the
// architecture. Idempotency is enforced by a unique (user_id,
// reminder_key) index — see upsertReminder below — so every call site
// can just call scheduleRemindersForEvent() again on any
// create/update/complete without worrying about duplicating rows.

async function upsertReminder(input: {
  userId: string;
  relatedEntityType: string;
  relatedEntityId: string;
  deliveryChannel: ReminderDeliveryChannel;
  bucket: LeadTimeBucket;
  scheduledFor: string;
  title: string;
  overdueCycle?: number;
  // The overdue sweep (runOverdueSweep) calls this on every single
  // authenticated page load for as long as an item stays overdue within
  // the same 7-day cycle (same reminder_key). Without this flag, that
  // reset the row back to 'pending' every time — including rows that
  // had already been sent or permanently failed — which re-fired an
  // already-delivered push/in-app/email reminder (and re-attempted an
  // already-failed one) on every page load instead of once per cycle.
  // insertOnly makes the sweep's calls a true no-op once a row for this
  // cycle exists, while scheduleRemindersForEvent's genuine reschedule
  // case (a due date actually changing) keeps the reset behavior below,
  // since a stale "already sent" record for the old date must not block
  // a fresh attempt for the new one.
  insertOnly?: boolean;
  // Documents' custom "N days before expiration" doesn't have a fixed
  // LEAD_DAYS_BY_BUCKET entry (bucket "custom" defaults to 0 there) —
  // this overrides the stored lead_time_days so the bookkeeping value
  // matches what was actually scheduled.
  leadDaysOverride?: number;
}): Promise<void> {
  const supabase = await createClient();
  const reminderKey = buildReminderKey(
    input.relatedEntityType,
    input.relatedEntityId,
    input.bucket,
    input.deliveryChannel,
    input.overdueCycle
  );

  const { error } = await supabase.from("reminders").upsert(
    {
      user_id: input.userId,
      related_entity_type: input.relatedEntityType,
      related_entity_id: input.relatedEntityId,
      delivery_channel: input.deliveryChannel,
      lead_time_days: input.leadDaysOverride ?? LEAD_DAYS_BY_BUCKET[input.bucket],
      lead_time_bucket: input.bucket,
      reminder_key: reminderKey,
      scheduled_for: input.scheduledFor,
      title: input.title,
      status: "pending",
      // Reset delivery bookkeeping — this upsert may be re-firing a row
      // that already sent (e.g. an appointment got rescheduled further
      // out after its 7-day reminder already went out); the stale
      // "already sent" record shouldn't block a fresh one for the new date.
      // Not applied when insertOnly is set (see comment above) — that
      // path uses DO NOTHING on conflict, so these values are irrelevant.
      sent_at: null,
      failure_reason: null,
      notification_id: null,
    },
    input.insertOnly ? { onConflict: "user_id,reminder_key", ignoreDuplicates: true } : { onConflict: "user_id,reminder_key" }
  );

  if (error) throw error;
}

// Same never-throws contract — called synchronously from delete/update
// routes right after (or alongside) the primary entity change, most
// often DELETE handlers where a swallowed error here must not stop the
// entity itself from actually being deleted.
export async function cancelRemindersForEntity(relatedEntityType: string, relatedEntityId: string): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("reminders")
      .update({ status: "cancelled" })
      .eq("related_entity_type", relatedEntityType)
      .eq("related_entity_id", relatedEntityId)
      .eq("status", "pending");

    if (error) throw error;
  } catch (err) {
    console.error("[reminders] cancelRemindersForEntity failed (entity change is unaffected):", {
      relatedEntityType,
      relatedEntityId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

type SchedulableCategory = "appointments" | "monitoring" | "bills" | "subscriptions" | "documents";
const EMAIL_TIMING_BUCKETS = ["seven_day", "three_day", "one_day", "day_of"] as const;

// Called whenever a schedulable event (an appointment, a monitoring
// item's due date) is created or its due date changes. Reads the user's
// notification_preferences to decide which lead-time buckets and which
// channels actually get a reminder row, computes each one's fire time
// via computeScheduledFor (DST-safe local-day math), and upserts —
// re-calling this for the same entity (a reschedule) updates the
// existing pending rows in place instead of creating duplicates.
// IMPORTANT: this is called synchronously inside 13 API routes' create/
// update handlers, immediately after the primary entity (bill,
// subscription, document, appointment, monitoring item) has already
// been written successfully. Reminder scheduling is a derived side
// effect of that save, never the save itself — a failure here (a
// missing column, a stale PostgREST schema cache, a transient DB error)
// must never be reported to the user as "failed to save the bill" when
// the bill in fact saved. The whole body is therefore wrapped so this
// function never throws; every real failure is still logged
// server-side for diagnosis. Same "best-effort side effect" philosophy
// already applied to processDueReminders() at the layout level and to
// sendPushToUser()'s per-device catch — just not previously applied
// here, which was the root cause of bills (and every other reminder-
// integrated entity) intermittently reporting a failed save that had
// actually already succeeded.
export async function scheduleRemindersForEvent(input: {
  relatedEntityType: string;
  relatedEntityId: string;
  dueAt: string;
  isDateOnly: boolean;
  category: SchedulableCategory;
  title: string;
}): Promise<void> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return;

    const profile = await getProfile();
    if (!profile) return;

    const prefs = profile.notification_preferences;
    const categoryPref = prefs[input.category];
    if (!categoryPref.push && !categoryPref.in_app && !categoryPref.email) return;

    const enabledBuckets = EMAIL_TIMING_BUCKETS.filter((bucket) => prefs.email_timing[bucket]);
    // Push and in-app both ride the same buckets as email (see the plan
    // note: the spec only shows timing checkboxes for email). If every
    // email-timing box is off, push/in-app still get a single "day of"
    // ping so enabling either for a category always does *something*.
    const buckets = enabledBuckets.length > 0 ? enabledBuckets : (["day_of"] as const);

    for (const bucket of buckets) {
      const scheduledFor = computeScheduledFor(input.dueAt, input.isDateOnly, bucket, profile.timezone);
      if (new Date(scheduledFor).getTime() <= Date.now()) continue;

      if (categoryPref.push) {
        await upsertReminder({
          userId: user.id,
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
          deliveryChannel: "push",
          bucket,
          scheduledFor,
          title: input.title,
        });
      }
      if (categoryPref.in_app) {
        await upsertReminder({
          userId: user.id,
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
          deliveryChannel: "in_app",
          bucket,
          scheduledFor,
          title: input.title,
        });
      }
      if (categoryPref.email) {
        await upsertReminder({
          userId: user.id,
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
          deliveryChannel: "email",
          bucket,
          scheduledFor,
          title: input.title,
        });
      }
    }
  } catch (err) {
    console.error("[reminders] scheduleRemindersForEvent failed (entity save is unaffected):", {
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

const APPOINTMENT_REMINDER_LOOKAHEAD_DAYS = 90;

// Recurring appointments can't have their reminders scheduled once at
// creation the way a fixed due date can — new occurrences keep
// appearing indefinitely. This reconciles reminders for every
// occurrence of one appointment series in the next 90 days: cancel
// every currently-pending virtual-occurrence reminder for the series
// first, then re-schedule exactly what the freshly regenerated
// occurrence list says should exist. That reconcile-from-scratch shape
// (rather than trying to diff old vs. new occurrences) is what makes a
// plain edit, a split ("this and following"), and a cancelled
// occurrence all "just re-run this" instead of three separate cases —
// re-run from the same opportunistic processDueReminders() sweep every
// other "interim substitute for a cron" mechanism in this file already
// uses, so the window keeps sliding forward with regular app use. A
// non-recurring appointment has exactly one occurrence (itself), so
// this reduces to scheduling that appointment's own reminder once.
// Virtual (non-override) occurrences use relatedEntityId
// "<masterId>:<occurrenceIso>" so each gets its own idempotent reminder
// row without a real DB row existing for it; an override IS a real row
// and is scheduled under its own id via the normal per-entity path
// instead (see the API routes, which call cancelRemindersForEntity/
// scheduleRemindersForEvent directly for override rows).
export async function scheduleAppointmentSeriesReminders(masterId: string): Promise<void> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return;

    const supabase = await createClient();

    await supabase
      .from("reminders")
      .update({ status: "cancelled" })
      .eq("related_entity_type", "appointment")
      .like("related_entity_id", `${masterId}:%`)
      .eq("status", "pending");

    const profile = await getProfile();
    if (!profile) return;
    const categoryPref = profile.notification_preferences.appointments;
    if (!categoryPref.push && !categoryPref.in_app && !categoryPref.email) return;

    const { data, error } = await supabase.from("appointments").select("*").or(`id.eq.${masterId},recurrence_parent_id.eq.${masterId}`);
    if (error) throw error;
    const rows = (data ?? []) as Appointment[];
    const master = rows.find((r) => r.id === masterId);
    if (!master || master.status !== "scheduled") return;

    const now = new Date();
    const rangeEnd = new Date(now.getTime() + APPOINTMENT_REMINDER_LOOKAHEAD_DAYS * 86_400_000);
    const occurrences = generateOccurrences(rows, now, rangeEnd).filter((o) => !o.isOverride);

    for (const [i, occurrence] of occurrences.entries()) {
      const title = occurrence.appointment.title ?? occurrence.appointment.provider_name ?? "Appointment";
      const relatedEntityId = `${masterId}:${occurrence.occurrenceStart}`;
      const leadMinutes = occurrence.appointment.reminder_lead_minutes;

      if (leadMinutes) {
        const scheduledFor = computeScheduledForMinutesBefore(occurrence.occurrenceStart, leadMinutes);
        if (new Date(scheduledFor).getTime() <= Date.now()) continue;

        if (categoryPref.push) {
          await upsertReminder({ userId: user.id, relatedEntityType: "appointment", relatedEntityId, deliveryChannel: "push", bucket: "custom", scheduledFor, title });
        }
        if (categoryPref.in_app) {
          await upsertReminder({ userId: user.id, relatedEntityType: "appointment", relatedEntityId, deliveryChannel: "in_app", bucket: "custom", scheduledFor, title });
        }
        if (categoryPref.email) {
          await upsertReminder({ userId: user.id, relatedEntityType: "appointment", relatedEntityId, deliveryChannel: "email", bucket: "custom", scheduledFor, title });
        }
      } else if (i === 0) {
        // No custom lead set on this occurrence's own row — fall back to
        // the standard day-based buckets, but only for the very next
        // occurrence. Scheduling day-based reminders for every future
        // occurrence of an indefinitely recurring series would be
        // unbounded and mostly redundant with this sweep re-running as
        // time passes and today's "next" occurrence changes.
        await scheduleRemindersForEvent({
          relatedEntityType: "appointment",
          relatedEntityId,
          dueAt: occurrence.occurrenceStart,
          isDateOnly: false,
          category: "appointments",
          title,
        });
      }
    }
  } catch (err) {
    console.error("[reminders] scheduleAppointmentSeriesReminders failed (entity save is unaffected):", {
      masterId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// A single-occurrence override row (a moved/edited instance of a
// recurring series — Calendar spec's "exceptions") is a real row with
// its own id, unlike a plain generated occurrence, so it's scheduled
// directly by that id rather than through the composite-key virtual-
// occurrence machinery scheduleAppointmentSeriesReminders() uses.
export async function scheduleAppointmentReminder(appointment: Appointment): Promise<void> {
  if (appointment.status !== "scheduled") {
    await cancelRemindersForEntity("appointment", appointment.id);
    return;
  }

  const title = appointment.title ?? appointment.provider_name ?? "Appointment";

  if (!appointment.reminder_lead_minutes) {
    await scheduleRemindersForEvent({
      relatedEntityType: "appointment",
      relatedEntityId: appointment.id,
      dueAt: appointment.date_time,
      isDateOnly: false,
      category: "appointments",
      title,
    });
    return;
  }

  try {
    const user = await getAuthenticatedUser();
    if (!user) return;
    const profile = await getProfile();
    if (!profile) return;
    const categoryPref = profile.notification_preferences.appointments;
    if (!categoryPref.push && !categoryPref.in_app && !categoryPref.email) return;

    const scheduledFor = computeScheduledForMinutesBefore(appointment.date_time, appointment.reminder_lead_minutes);
    if (new Date(scheduledFor).getTime() <= Date.now()) return;

    if (categoryPref.push) {
      await upsertReminder({ userId: user.id, relatedEntityType: "appointment", relatedEntityId: appointment.id, deliveryChannel: "push", bucket: "custom", scheduledFor, title });
    }
    if (categoryPref.in_app) {
      await upsertReminder({ userId: user.id, relatedEntityType: "appointment", relatedEntityId: appointment.id, deliveryChannel: "in_app", bucket: "custom", scheduledFor, title });
    }
    if (categoryPref.email) {
      await upsertReminder({ userId: user.id, relatedEntityType: "appointment", relatedEntityId: appointment.id, deliveryChannel: "email", bucket: "custom", scheduledFor, title });
    }
  } catch (err) {
    console.error("[reminders] scheduleAppointmentReminder failed (entity save is unaffected):", {
      id: appointment.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// Documents spec, Section 77: "N days before expiration" — a single,
// per-document custom lead time, not the fixed 7/3/1/day-of ladder every
// other category shares via the email_timing prefs above. One reminder
// per enabled channel, bucket "custom", scheduled via the same DST-safe
// computeScheduledFor math (just given an explicit lead-day count
// instead of a bucket lookup). Re-calling this on an update (e.g. a new
// expiration_date) upserts in place, same idempotency guarantee as
// scheduleRemindersForEvent.
// Same never-throws contract as scheduleRemindersForEvent above, and
// for the identical reason — called synchronously from Documents'
// create/update routes right after the document itself already saved.
export async function scheduleCustomLeadReminder(input: {
  relatedEntityType: string;
  relatedEntityId: string;
  targetDate: string;
  leadDays: number;
  category: SchedulableCategory;
  title: string;
}): Promise<void> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return;

    const profile = await getProfile();
    if (!profile) return;

    const categoryPref = profile.notification_preferences[input.category];
    if (!categoryPref.push && !categoryPref.in_app && !categoryPref.email) return;

    const scheduledFor = computeScheduledFor(input.targetDate, true, "custom", profile.timezone, input.leadDays);
    if (new Date(scheduledFor).getTime() <= Date.now()) return;

    if (categoryPref.push) {
      await upsertReminder({
        userId: user.id,
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
        deliveryChannel: "push",
        bucket: "custom",
        scheduledFor,
        title: input.title,
        leadDaysOverride: input.leadDays,
      });
    }
    if (categoryPref.in_app) {
      await upsertReminder({
        userId: user.id,
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
        deliveryChannel: "in_app",
        bucket: "custom",
        scheduledFor,
        title: input.title,
        leadDaysOverride: input.leadDays,
      });
    }
    if (categoryPref.email) {
      await upsertReminder({
        userId: user.id,
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
        deliveryChannel: "email",
        bucket: "custom",
        scheduledFor,
        title: input.title,
        leadDaysOverride: input.leadDays,
      });
    }
  } catch (err) {
    console.error("[reminders] scheduleCustomLeadReminder failed (entity save is unaffected):", {
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// Immediate (not scheduled) push/in-app/email notification for "general
// activity" — a lab result added, weight logged, etc. Email is off by
// default per the spec's explicit "Email — OPTIONAL" policy; push +
// in-app are on by default (the primary channels). Only called from
// the 4 named creation points, not from every entity, so this never
// becomes "a push for every LifeOS activity."
// Same never-throws contract as scheduleRemindersForEvent/
// createTimelineEvent, for the identical reason — called from 5 health
// routes right after the primary record (a lab result, weight entry,
// etc.) already saved; every call site discards the return value, so a
// notification failure here must never be reported as the save itself
// having failed.
export async function createGeneralActivityNotification(input: {
  title: string;
  relatedEntityType: string;
  relatedEntityId: string;
}): Promise<void> {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser();
    if (!user) return;

    const profile = await getProfile();
    if (!profile) return;

    const pref = profile.notification_preferences.general_activity;
    if (!pref.push && !pref.in_app && !pref.email) return;

    if (pref.in_app) {
      const { error } = await supabase.from("notifications").insert({
        user_id: user.id,
        category: "general_activity",
        title: input.title,
        body: null,
        related_entity_type: input.relatedEntityType,
        related_entity_id: input.relatedEntityId,
      });
      if (error) throw error;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    if (pref.push && isPushConfigured()) {
      await sendPushToUser(user.id, buildPushPayload(input.relatedEntityType, appUrl));
    }

    if (pref.email && user.email) {
      try {
        await getEmailSender().send({ to: user.email, ...buildReminderEmail(input.relatedEntityType, appUrl) });
      } catch (err) {
        console.error("[notifications] General-activity email failed:", err instanceof Error ? err.message : String(err));
      }
    }
  } catch (err) {
    console.error("[notifications] createGeneralActivityNotification failed (entity save is unaffected):", {
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// Fans a single push payload out to every active device for a user
// (Spec Section 7: multiple devices per user) — best-effort, never
// throws: one device's failure (or an unconfigured push setup) must not
// block the in-app/email channels this runs alongside. Invalid
// subscriptions (404/410) are deactivated immediately rather than left
// to fail again on the next attempt (Spec Section 16).
async function sendPushToUser(userId: string, payload: Parameters<typeof sendPushNotification>[1]): Promise<void> {
  const subscriptions = await listActivePushSubscriptionsForUser(userId);

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await sendPushNotification({ endpoint: subscription.endpoint, p256dh: subscription.p256dh, auth: subscription.auth_key }, payload);
      } catch (err) {
        if (isSubscriptionGone(err)) {
          await deactivatePushSubscriptionById(subscription.id).catch(() => undefined);
        } else {
          console.error("[push] Send failed:", { subscriptionId: subscription.id, error: err instanceof Error ? err.message : String(err) });
        }
      }
    })
  );
}

async function listPendingDueReminders(): Promise<Reminder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString());

  if (error) throw error;
  return data as Reminder[];
}

// Monitoring items, appointments, bills, subscriptions, and (now)
// personal documents each get their own sweep loop here rather than a
// generic plugin registry — five real cases is still small enough that
// the registry would be pure indirection with no payoff yet.
async function runOverdueSweep(userId: string): Promise<void> {
  const profile = await getProfile();
  if (!profile) return;
  const prefs = profile.notification_preferences;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  async function scheduleOverdue(
    relatedEntityType: string,
    relatedEntityId: string,
    title: string,
    categoryPref: NotificationCategoryPreference,
    daysOverdue: number
  ): Promise<void> {
    const cycle = Math.floor(daysOverdue / 7);
    const scheduledFor = now.toISOString();

    // Push rides the same "every cycle" cadence as in-app — both are
    // primary channels, unlike email's overdue_email_enabled/recurring
    // toggles, which are explicitly email-only settings by name.
    if (categoryPref.push) {
      await upsertReminder({
        userId,
        relatedEntityType,
        relatedEntityId,
        deliveryChannel: "push",
        bucket: "overdue",
        scheduledFor,
        title,
        overdueCycle: cycle,
        insertOnly: true,
      });
    }
    if (categoryPref.in_app) {
      await upsertReminder({
        userId,
        relatedEntityType,
        relatedEntityId,
        deliveryChannel: "in_app",
        bucket: "overdue",
        scheduledFor,
        title,
        overdueCycle: cycle,
        insertOnly: true,
      });
    }
    // Cycle 0 always gets one overdue email (if the category + overdue
    // toggle allow it); a later cycle only fires if the user opted into
    // recurring overdue emails — this is what prevents "duplicate
    // overdue emails repeatedly" while still allowing opt-in recurrence.
    if (categoryPref.email && prefs.overdue_email_enabled && (cycle === 0 || prefs.overdue_email_recurring)) {
      await upsertReminder({
        userId,
        relatedEntityType,
        relatedEntityId,
        deliveryChannel: "email",
        bucket: "overdue",
        scheduledFor,
        title,
        overdueCycle: cycle,
        insertOnly: true,
      });
    }
  }

  const [monitoringItems, appointments, bills, subscriptions, documents] = await Promise.all([
    listMonitoringItems(),
    listAppointments(),
    listBills(),
    listSubscriptions(),
    listPersonalDocuments(),
  ]);

  for (const item of monitoringItems) {
    if (item.status !== "active" || !item.next_due_at || item.next_due_at >= todayStr) continue;
    const daysOverdue = Math.floor((now.getTime() - new Date(`${item.next_due_at}T00:00:00Z`).getTime()) / 86_400_000);
    await scheduleOverdue("monitoring_item", item.id, item.name, prefs.monitoring, daysOverdue);
  }

  for (const appointment of appointments) {
    // A recurring master's own date_time is just its DTSTART (often
    // long past) — "overdue" only means something for a genuine
    // one-time miss, so recurring masters are skipped here entirely; a
    // standalone appointment or a single-occurrence override row (both
    // always have recurrence_rule = null) still get the normal check.
    if (appointment.recurrence_rule) continue;
    const dueAt = new Date(appointment.date_time);
    if (appointment.status !== "scheduled" || dueAt >= now) continue;
    const daysOverdue = Math.floor((now.getTime() - dueAt.getTime()) / 86_400_000);
    const title = appointment.title ?? appointment.provider_name ?? "Appointment";
    await scheduleOverdue("appointment", appointment.id, title, prefs.appointments, daysOverdue);
  }

  for (const bill of bills) {
    if (bill.status !== "pending" || !bill.reminders_enabled || bill.due_date >= todayStr) continue;
    const daysOverdue = Math.floor((now.getTime() - new Date(`${bill.due_date}T00:00:00Z`).getTime()) / 86_400_000);
    await scheduleOverdue("bill", bill.id, bill.name, prefs.bills, daysOverdue);
  }

  for (const subscription of subscriptions) {
    if (subscription.status !== "active" || !subscription.reminders_enabled || subscription.next_billing_date >= todayStr) continue;
    const daysOverdue = Math.floor(
      (now.getTime() - new Date(`${subscription.next_billing_date}T00:00:00Z`).getTime()) / 86_400_000
    );
    await scheduleOverdue("subscription", subscription.id, subscription.name, prefs.subscriptions, daysOverdue);
  }

  for (const document of documents) {
    if (!document.expiration_date || !document.reminders_enabled || document.expiration_date >= todayStr) continue;
    const daysOverdue = Math.floor((now.getTime() - new Date(`${document.expiration_date}T00:00:00Z`).getTime()) / 86_400_000);
    await scheduleOverdue("personal_document", document.id, document.name, prefs.documents, daysOverdue);
  }
}

// Faith/Dua spec, Section 14: one recurring push/in-app/email reminder
// per enabled named block (morning/evening/before_sleep), at that
// block's own configured time-of-day — architecturally different from
// every other category's reminders (which fire N days before a fixed
// future date), so this doesn't go through scheduleRemindersForEvent's
// lead-time-bucket loop at all. relatedEntityId encodes the schedule
// type AND the target calendar date (e.g. "morning:2026-08-28"), so the
// existing (user_id, reminder_key) uniqueness naturally produces exactly
// one reminder per block per day — calling this again today (e.g. on a
// second page load) is a no-op upsert, never a duplicate.
async function ensureDailyDuaReminders(userId: string): Promise<void> {
  const profile = await getProfile();
  if (!profile) return;

  const duaPref = profile.notification_preferences.dua;
  if (!duaPref.push && !duaPref.in_app && !duaPref.email) return;

  const settings = (await listDuaReminderSettings()).filter((setting) => setting.enabled);
  if (settings.length === 0) return;

  const now = new Date();
  const todayStr = format(toZonedTime(now, profile.timezone), "yyyy-MM-dd");

  const SCHEDULE_LABELS: Record<string, string> = {
    morning: "Morning",
    evening: "Evening",
    before_sleep: "Before Sleep",
  };

  for (const setting of settings) {
    const candidateToday = fromZonedTime(`${todayStr}T${setting.time_of_day}:00`, profile.timezone);
    const targetDateStr = candidateToday.getTime() <= now.getTime() ? format(addDays(now, 1), "yyyy-MM-dd") : todayStr;
    const scheduledFor = fromZonedTime(`${targetDateStr}T${setting.time_of_day}:00`, profile.timezone).toISOString();

    const relatedEntityId = `${setting.schedule_type}:${targetDateStr}`;
    const title = `${SCHEDULE_LABELS[setting.schedule_type] ?? setting.schedule_type} Dua routine`;

    if (duaPref.push) {
      await upsertReminder({
        userId,
        relatedEntityType: "dua_routine",
        relatedEntityId,
        deliveryChannel: "push",
        bucket: "custom",
        scheduledFor,
        title,
      });
    }
    if (duaPref.in_app) {
      await upsertReminder({
        userId,
        relatedEntityType: "dua_routine",
        relatedEntityId,
        deliveryChannel: "in_app",
        bucket: "custom",
        scheduledFor,
        title,
      });
    }
    if (duaPref.email) {
      await upsertReminder({
        userId,
        relatedEntityType: "dua_routine",
        relatedEntityId,
        deliveryChannel: "email",
        bucket: "custom",
        scheduledFor,
        title,
      });
    }
  }
}

// Interim substitute for a real scheduled trigger (Addendum Section 21:
// on Vercel this would be a Cron job hitting a route that runs this on a
// schedule — that route/config doesn't exist yet, since it only takes
// effect once actually deployed, not in local dev). Until then, this
// runs opportunistically wherever an authenticated page calls it
// (currently the (app) layout), so a due reminder — push, in-app, or
// email — fires the next time the user has the app open rather than at
// the exact scheduled moment.
export async function processDueReminders(): Promise<void> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return;
  const userId = user.id;
  const userEmail = user.email;

  // Each sweep is independent — one bad entity (a corrupted due_date, a
  // transient DB error) must not prevent the OTHER sweep from running,
  // or prevent the due-reminder processing loop below from running at
  // all for this page load. The outer processDueReminders() call is
  // already best-effort at the (app) layout level; this extra layer
  // just keeps a single sweep's failure from taking the other down with
  // it, rather than relying on the whole function throwing and starting
  // over next page load.
  try {
    await runOverdueSweep(userId);
  } catch (err) {
    console.error("[reminders] runOverdueSweep failed:", err instanceof Error ? err.message : String(err));
  }
  try {
    await ensureDailyDuaReminders(userId);
  } catch (err) {
    console.error("[reminders] ensureDailyDuaReminders failed:", err instanceof Error ? err.message : String(err));
  }

  const due = await listPendingDueReminders();
  if (due.length === 0) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Fetched once and reused for every push reminder in this batch —
  // they all belong to the same authenticated user.
  let pushSubscriptions: Awaited<ReturnType<typeof listActivePushSubscriptionsForUser>> | null = null;
  async function getPushSubscriptions() {
    if (pushSubscriptions === null) pushSubscriptions = await listActivePushSubscriptionsForUser(userId);
    return pushSubscriptions;
  }

  for (const reminder of due) {
    try {
      if (reminder.delivery_channel === "push") {
        if (!isPushConfigured()) throw new Error("Push is not configured (missing VAPID keys)");

        const subscriptions = await getPushSubscriptions();
        if (subscriptions.length === 0) throw new Error("No active push subscription for this user");

        const isOverdue = reminder.lead_time_bucket === "overdue";
        const payload = buildPushPayload(reminder.related_entity_type, appUrl, isOverdue);

        // Fan out to every device; the push service only ever confirms
        // acceptance, never on-device display (Spec Section 14) — this
        // reminder counts as "sent" once at least one device accepted it.
        let anySucceeded = false;
        for (const subscription of subscriptions) {
          try {
            await sendPushNotification(
              { endpoint: subscription.endpoint, p256dh: subscription.p256dh, auth: subscription.auth_key },
              payload
            );
            anySucceeded = true;
          } catch (sendErr) {
            if (isSubscriptionGone(sendErr)) {
              await deactivatePushSubscriptionById(subscription.id).catch(() => undefined);
            } else {
              console.error("[push] Send failed for reminder:", {
                reminderId: reminder.id,
                subscriptionId: subscription.id,
                error: sendErr instanceof Error ? sendErr.message : String(sendErr),
              });
            }
          }
        }

        if (!anySucceeded) throw new Error("Push delivery failed for every active device");

        const { error: reminderError } = await supabase
          .from("reminders")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", reminder.id);

        if (reminderError) throw reminderError;
      } else if (reminder.delivery_channel === "in_app") {
        const { data: notification, error: notificationError } = await supabase
          .from("notifications")
          .insert({
            user_id: userId,
            category: "reminder",
            title: reminder.title,
            body: reminder.body,
            related_entity_type: reminder.related_entity_type,
            related_entity_id: reminder.related_entity_id,
          })
          .select()
          .single();

        if (notificationError) throw notificationError;

        const { error: reminderError } = await supabase
          .from("reminders")
          .update({ status: "sent", sent_at: new Date().toISOString(), notification_id: notification.id })
          .eq("id", reminder.id);

        if (reminderError) throw reminderError;
      } else if (reminder.delivery_channel === "email" && userEmail) {
        const isOverdue = reminder.lead_time_bucket === "overdue";
        const email = buildReminderEmail(reminder.related_entity_type, appUrl, isOverdue);
        await getEmailSender().send({ to: userEmail, ...email });

        const { error: reminderError } = await supabase
          .from("reminders")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", reminder.id);

        if (reminderError) throw reminderError;
      }
    } catch (err) {
      // One failed reminder (e.g. Resend rejects a send) must not abort
      // the rest of the batch — record the failure and keep going.
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[reminders] Failed to process reminder:", { id: reminder.id, channel: reminder.delivery_channel, error: message });

      await supabase.from("reminders").update({ status: "failed", failure_reason: message }).eq("id", reminder.id);
    }
  }
}
