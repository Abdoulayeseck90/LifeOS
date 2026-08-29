import { genericReminderLabel } from "@/services/core/email";
import type { PushPayload } from "@/lib/push/web-push";

// Reuses the exact same generic entity-type labels as the email channel
// (services/core/email.ts) — Spec Section 24 wants ONE coherent
// notification architecture, not a separately-invented phrasing per
// channel. Section 10's own example push bodies ("Appointment tomorrow
// at 9:00 AM with Dr. Jensen") are more specific than that shared
// policy allows; Section 10's closing rule ("avoid putting detailed
// health information in the notification title/body... the user should
// open LifeOS for details") is what's actually implemented, matching
// the already-tested email behavior (tests/email.test.ts).
const PATH_BY_ENTITY_TYPE: Record<string, string> = {
  appointment: "/health/appointments",
  monitoring_item: "/health/monitoring",
  bill: "/finance/bills",
  subscription: "/finance/subscriptions",
  personal_document: "/documents",
  dua_routine: "/faith/dua",
};
const DEFAULT_PATH = "/notifications";

export function buildPushPayload(relatedEntityType: string | null, appUrl: string, isOverdue = false): PushPayload {
  const label = genericReminderLabel(relatedEntityType);
  const body = isOverdue ? "You have a reminder that needs attention." : `You have ${label}.`;
  const path = relatedEntityType ? (PATH_BY_ENTITY_TYPE[relatedEntityType] ?? DEFAULT_PATH) : DEFAULT_PATH;

  return { title: "LifeOS", body, url: `${appUrl}${path}` };
}
