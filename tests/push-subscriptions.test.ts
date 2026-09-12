import { describe, it, expect, vi, beforeEach } from "vitest";

// Minimal chainable Supabase query-builder stub: every chain method
// returns the same object so `.eq().eq()` works, and the object itself
// is awaitable (thenable) to resolve the final { data, error } result —
// matches how the real supabase-js builder behaves closely enough for
// these two functions, which only ever chain .select()/.update()/.eq().
function makeBuilder(result: { data?: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {};
  builder.select = vi.fn(() => builder);
  builder.update = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.then = (resolve: (value: unknown) => unknown) => resolve(result);
  return builder;
}

const { serverCreateClientMock } = vi.hoisted(() => ({ serverCreateClientMock: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: serverCreateClientMock,
  getAuthenticatedUser: vi.fn(),
}));

import { listActivePushSubscriptionsForUser, deactivatePushSubscriptionById } from "@/services/core/push-subscriptions";

describe("listActivePushSubscriptionsForUser", () => {
  beforeEach(() => {
    serverCreateClientMock.mockReset();
  });

  it("uses the injected client and never calls the cookie-based createClient() when one is given", async () => {
    const builder = makeBuilder({ data: [{ id: "sub-1" }], error: null });
    const injectedClient = { from: vi.fn(() => builder) };

    const result = await listActivePushSubscriptionsForUser("user-1", injectedClient as never);

    expect(result).toEqual([{ id: "sub-1" }]);
    expect(injectedClient.from).toHaveBeenCalledWith("push_subscriptions");
    expect(serverCreateClientMock).not.toHaveBeenCalled();
  });

  it("scopes the query to the given user_id and active status even with an admin (RLS-bypassing) client", async () => {
    const builder = makeBuilder({ data: [], error: null });
    const injectedClient = { from: vi.fn(() => builder) };

    await listActivePushSubscriptionsForUser("user-2", injectedClient as never);

    expect(builder.eq).toHaveBeenCalledWith("user_id", "user-2");
    expect(builder.eq).toHaveBeenCalledWith("status", "active");
  });

  it("falls back to the cookie-based createClient() when no client is given", async () => {
    const builder = makeBuilder({ data: [], error: null });
    serverCreateClientMock.mockResolvedValue({ from: vi.fn(() => builder) });

    await listActivePushSubscriptionsForUser("user-1");

    expect(serverCreateClientMock).toHaveBeenCalledTimes(1);
  });

  it("throws on a database error instead of silently returning an empty list", async () => {
    const builder = makeBuilder({ data: null, error: { message: "boom" } });
    const injectedClient = { from: vi.fn(() => builder) };

    await expect(listActivePushSubscriptionsForUser("user-1", injectedClient as never)).rejects.toBeTruthy();
  });
});

describe("deactivatePushSubscriptionById", () => {
  beforeEach(() => {
    serverCreateClientMock.mockReset();
  });

  it("uses the injected client and updates status to inactive by id", async () => {
    const builder = makeBuilder({ error: null });
    const injectedClient = { from: vi.fn(() => builder) };

    await deactivatePushSubscriptionById("sub-1", injectedClient as never);

    expect(injectedClient.from).toHaveBeenCalledWith("push_subscriptions");
    expect(builder.update).toHaveBeenCalledWith({ status: "inactive" });
    expect(builder.eq).toHaveBeenCalledWith("id", "sub-1");
    expect(serverCreateClientMock).not.toHaveBeenCalled();
  });

  it("falls back to the cookie-based createClient() when no client is given", async () => {
    const builder = makeBuilder({ error: null });
    serverCreateClientMock.mockResolvedValue({ from: vi.fn(() => builder) });

    await deactivatePushSubscriptionById("sub-1");

    expect(serverCreateClientMock).toHaveBeenCalledTimes(1);
  });
});
