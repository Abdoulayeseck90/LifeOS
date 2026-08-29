import { Resend } from "resend";

// Pluggable interface (Spec Section 26: "build the correct
// interface/abstraction" when an external service is involved) — swap
// ResendEmailSender for another provider later without touching
// anything that calls getEmailSender().
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

class ResendEmailSender implements EmailSender {
  constructor(
    private readonly client: Resend,
    private readonly from: string
  ) {}

  async send(message: EmailMessage): Promise<void> {
    const { data, error } = await this.client.emails.send({
      from: this.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    if (error) {
      // Log enough to diagnose (Resend's own error name/message, which
      // subject line failed) without ever logging the API key or the
      // email body — html/text are already generic, non-medical content
      // by construction (see buildReminderEmail below), but this stays
      // defensive regardless of what a future caller passes in.
      console.error("[email] Resend send failed:", { subject: message.subject, error: error.name, message: error.message });
      throw new Error(error.message);
    }

    console.log("[email] Resend send succeeded:", { id: data?.id, subject: message.subject });
  }
}

// Falls back to logging instead of throwing when RESEND_API_KEY /
// RESEND_FROM_EMAIL aren't configured — lets the reminder engine run in any
// environment (local dev, tests, a fresh clone) without an email
// provider set up yet, per Section 26's "clearly document the remaining
// integration work" rather than hard-failing.
class ConsoleEmailSender implements EmailSender {
  async send(message: EmailMessage): Promise<void> {
    console.log(`[email:not configured] to=${message.to} subject="${message.subject}"`);
  }
}

let cachedSender: EmailSender | null = null;

export function getEmailSender(): EmailSender {
  if (cachedSender) return cachedSender;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  cachedSender = apiKey && from ? new ResendEmailSender(new Resend(apiKey), from) : new ConsoleEmailSender();
  return cachedSender;
}

// Notification Timing & Email Rules addendum: never put sensitive
// medical content in an email subject or body — "You have an upcoming
// health monitoring item," never "Your Hepatitis B viral load test is
// overdue." This table is the only place in the reminder engine that
// knows about specific entity types, and it only maps to generic,
// non-specific phrasing — the engine itself (services/core/reminders.ts)
// stays domain-agnostic. The literal word "overdue" is deliberately never
// used either (tests/email.test.ts locks this in) — an overdue reminder
// gets the same "needs attention" phrasing as everything else, since
// even that one word paired with a health context reveals more than
// "you have a reminder" does.
const GENERIC_LABEL_BY_ENTITY_TYPE: Record<string, string> = {
  monitoring_item: "an upcoming health monitoring item",
  appointment: "an upcoming appointment",
  medication: "a medication reminder",
  bill: "an upcoming bill",
  subscription: "an upcoming subscription renewal",
  personal_document: "a document nearing expiration",
  dua_routine: "your Dua routine ready for today",
};
const DEFAULT_GENERIC_LABEL = "a new reminder";

// Shared by both buildReminderEmail below and buildPushPayload
// (src/lib/push/content.ts) — one canonical "how do we phrase a
// reminder generically" table for every channel, not a second
// re-invented mapping per channel (Spec Section 24: "ONE coherent
// notification architecture").
export function genericReminderLabel(relatedEntityType: string | null): string {
  return relatedEntityType ? (GENERIC_LABEL_BY_ENTITY_TYPE[relatedEntityType] ?? DEFAULT_GENERIC_LABEL) : DEFAULT_GENERIC_LABEL;
}

export function buildReminderEmail(
  relatedEntityType: string | null,
  appUrl: string,
  isOverdue = false
): Pick<EmailMessage, "subject" | "html" | "text"> {
  const label = genericReminderLabel(relatedEntityType);
  const subject = isOverdue ? "LifeOS: You have a reminder that needs attention" : `LifeOS: You have ${label}`;
  const notificationsUrl = `${appUrl}/notifications`;

  const text = `${subject}.\n\nSign in to LifeOS to see the details: ${notificationsUrl}`;
  const html = `<p>${subject}.</p><p><a href="${notificationsUrl}">Sign in to LifeOS</a> to see the details.</p>`;

  return { subject, html, text };
}

// Settings → Notifications → "Send Test Email" (Section 9 of the Resend
// fix request). Deliberately not a reminder — no related entity, no
// timing logic — just a direct round-trip check of the sender config.
export function buildTestEmail(): Pick<EmailMessage, "subject" | "html" | "text"> {
  const subject = "LifeOS test email";
  const text = "This is a test email from LifeOS to confirm your email notifications are working.";
  const html = `<p>${text}</p>`;
  return { subject, html, text };
}
