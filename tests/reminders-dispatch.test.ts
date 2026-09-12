import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Reminder } from "@/types/core/entities";

// processDueRemindersGlobally() is the cron-safe entry point this whole
// fix is about (src/app/api/cron/process-reminders/route.ts calls it on a
// schedule, independent of any user request). It's exercised here as a
// black box rather than reaching into the private dispatchDueReminder()
// helper directly, mirroring how no other function in this file is unit
// tested in isolation from its public entry point.

function reminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: "rem-1",
    user_id: "user-1",
    related_entity_type: "appointment",
    related_entity_id: "appt-1",
    delivery_channel: "push",
    lead_time_days: 0,
    lead_time_bucket: "custom",
    reminder_key: "appointment:appt-1:custom:push",
    scheduled_for: "2026-09-05T21:00:00.000Z",
    title: "Appointment Reminder",
    body: null,
    status: "pending",
    sent_at: null,
    failure_reason: null,
    notification_id: null,
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeRemindersBuilder(due: Reminder[]) {
  const builder: Record<string, unknown> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.lte = vi.fn(() => builder);
  builder.update = updateSpy;
  builder.then = (resolve: (v: unknown) => unknown) => resolve({ data: due, error: null });
  return builder;
}

let updateSpy: ReturnType<typeof vi.fn>;
let notificationsInsertSpy: ReturnType<typeof vi.fn>;

function makeAdminClient(due: Reminder[]) {
  updateSpy = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }));
  notificationsInsertSpy = vi.fn(() => ({
    select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: { id: "notif-1" }, error: null })) })),
  }));

  return {
    from: vi.fn((table: string) => {
      if (table === "reminders") return makeRemindersBuilder(due);
      if (table === "notifications") return { insert: notificationsInsertSpy };
      throw new Error(`Unexpected table: ${table}`);
    }),
    auth: {
      admin: {
        getUserById: vi.fn(async (userId: string) => ({ data: { user: { email: `${userId}@example.com` } }, error: null })),
      },
    },
  };
}

const { createAdminClientMock } = vi.hoisted(() => ({ createAdminClientMock: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: createAdminClientMock,
}));

const { sendPushNotificationMock, isSubscriptionGoneMock } = vi.hoisted(() => ({
  sendPushNotificationMock: vi.fn(),
  isSubscriptionGoneMock: vi.fn(),
}));
vi.mock("@/lib/push/web-push", () => ({
  sendPushNotification: sendPushNotificationMock,
  isSubscriptionGone: isSubscriptionGoneMock,
  isPushConfigured: () => true,
}));

const { listActivePushSubscriptionsForUserMock, deactivatePushSubscriptionByIdMock } = vi.hoisted(() => ({
  listActivePushSubscriptionsForUserMock: vi.fn(),
  deactivatePushSubscriptionByIdMock: vi.fn(),
}));
vi.mock("@/services/core/push-subscriptions", () => ({
  listActivePushSubscriptionsForUser: listActivePushSubscriptionsForUserMock,
  deactivatePushSubscriptionById: deactivatePushSubscriptionByIdMock,
}));

const { sendEmailMock } = vi.hoisted(() => ({ sendEmailMock: vi.fn() }));
vi.mock("@/services/core/email", () => ({
  getEmailSender: () => ({ send: sendEmailMock }),
  buildReminderEmail: () => ({ subject: "Reminder", html: "<p>Reminder</p>" }),
}));

vi.mock("@/lib/push/content", () => ({
  buildPushPayload: () => ({ title: "Reminder", body: "You have a new LifeOS reminder.", url: "/dashboard" }),
}));

import { processDueRemindersGlobally } from "@/services/core/reminders";

describe("processDueRemindersGlobally", () => {
  beforeEach(() => {
    sendPushNotificationMock.mockReset();
    isSubscriptionGoneMock.mockReset().mockReturnValue(false);
    listActivePushSubscriptionsForUserMock.mockReset();
    deactivatePushSubscriptionByIdMock.mockReset().mockResolvedValue(undefined);
    sendEmailMock.mockReset();
    createAdminClientMock.mockReset();
  });

  it("returns zero counts and does nothing when no reminders are due", async () => {
    createAdminClientMock.mockReturnValue(makeAdminClient([]));
    const result = await processDueRemindersGlobally();
    expect(result).toEqual({ processed: 0, failed: 0 });
  });

  it("sends push notifications across multiple different users in one sweep", async () => {
    const due = [
      reminder({ id: "rem-1", user_id: "user-a" }),
      reminder({ id: "rem-2", user_id: "user-b", related_entity_id: "appt-2" }),
    ];
    createAdminClientMock.mockReturnValue(makeAdminClient(due));
    listActivePushSubscriptionsForUserMock.mockImplementation(async (userId: string) => [
      { id: `sub-${userId}`, user_id: userId, endpoint: `https://push.example/${userId}`, p256dh: "p", auth_key: "a", status: "active" },
    ]);
    sendPushNotificationMock.mockResolvedValue(undefined);

    const result = await processDueRemindersGlobally();

    expect(result).toEqual({ processed: 2, failed: 0 });
    expect(sendPushNotificationMock).toHaveBeenCalledTimes(2);
    expect(listActivePushSubscriptionsForUserMock).toHaveBeenCalledWith("user-a", expect.anything());
    expect(listActivePushSubscriptionsForUserMock).toHaveBeenCalledWith("user-b", expect.anything());
  });

  it("marks a reminder failed (not thrown) when the user has no active push subscription, and keeps processing the rest", async () => {
    const due = [reminder({ id: "rem-1", user_id: "user-a" }), reminder({ id: "rem-2", user_id: "user-b" })];
    createAdminClientMock.mockReturnValue(makeAdminClient(due));
    listActivePushSubscriptionsForUserMock.mockImplementation(async (userId: string) =>
      userId === "user-a" ? [] : [{ id: "sub-b", user_id: "user-b", endpoint: "https://push.example/b", p256dh: "p", auth_key: "a", status: "active" }]
    );
    sendPushNotificationMock.mockResolvedValue(undefined);

    const result = await processDueRemindersGlobally();

    expect(result).toEqual({ processed: 1, failed: 1 });
  });

  it("deactivates a subscription that comes back 404/410 without affecting other reminders", async () => {
    const due = [reminder({ id: "rem-1", user_id: "user-a" })];
    createAdminClientMock.mockReturnValue(makeAdminClient(due));
    listActivePushSubscriptionsForUserMock.mockResolvedValue([
      { id: "sub-gone", user_id: "user-a", endpoint: "https://push.example/gone", p256dh: "p", auth_key: "a", status: "active" },
    ]);
    sendPushNotificationMock.mockRejectedValue(new Error("Gone"));
    isSubscriptionGoneMock.mockReturnValue(true);

    const result = await processDueRemindersGlobally();

    expect(result).toEqual({ processed: 0, failed: 1 });
    expect(deactivatePushSubscriptionByIdMock).toHaveBeenCalledWith("sub-gone", expect.anything());
  });

  it("only fetches an email lookup for email-channel reminders", async () => {
    const due = [reminder({ id: "rem-1", user_id: "user-a", delivery_channel: "in_app" })];
    const admin = makeAdminClient(due);
    createAdminClientMock.mockReturnValue(admin);

    const result = await processDueRemindersGlobally();

    expect(result).toEqual({ processed: 1, failed: 0 });
    expect(admin.auth.admin.getUserById).not.toHaveBeenCalled();
    expect(notificationsInsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-a", related_entity_type: "appointment" })
    );
  });
});
