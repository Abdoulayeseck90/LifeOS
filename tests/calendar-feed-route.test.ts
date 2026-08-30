import { describe, it, expect, vi, beforeEach } from "vitest";
import { hashCalendarFeedToken } from "@/lib/calendar/feed-token";

// This is a unit test of the ROUTE's own logic — it proves what
// arguments the route sends to the database, not what the database does
// with them (that requires a live Postgres instance, which this
// environment does not have; see the SQL migration's own structure for
// the DB-level guarantee: get_calendar_feed_events only ever accepts
// p_token_hash, never a user id, so there is no argument shape this
// route could send that would ask for another user's data even if it
// tried).
const rpcMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ rpc: rpcMock })),
}));

import { GET } from "@/app/api/calendar/feed/[token]/route";

function makeParams(token: string) {
  return { params: Promise.resolve({ token }) };
}

describe("GET /api/calendar/feed/[token]", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("calls get_calendar_feed_events with ONLY p_token_hash, never a user id", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });

    await GET({} as never, makeParams("my-raw-token"));

    expect(rpcMock).toHaveBeenCalledTimes(1);
    const call = rpcMock.mock.calls[0];
    if (!call) throw new Error("rpc was not called");
    const [fnName, args] = call;
    expect(fnName).toBe("get_calendar_feed_events");
    expect(Object.keys(args)).toEqual(["p_token_hash"]);
    expect(args.p_token_hash).toBe(hashCalendarFeedToken("my-raw-token"));
    // The critical assertion: no user_id/p_user_id ever leaves this route.
    expect(args).not.toHaveProperty("user_id");
    expect(args).not.toHaveProperty("p_user_id");
  });

  it("never calls any function other than get_calendar_feed_events", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });
    await GET({} as never, makeParams("token"));
    for (const call of rpcMock.mock.calls) {
      expect(call[0]).toBe("get_calendar_feed_events");
    }
  });

  it("returns a valid empty ICS calendar (200) for a token that yields zero rows", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });

    const response = await GET({} as never, makeParams("invalid-or-revoked-token"));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/calendar");
    expect(body).toContain("BEGIN:VCALENDAR");
    expect(body).toContain("END:VCALENDAR");
    expect(body).not.toContain("BEGIN:VEVENT");
  });

  it("returns 404 immediately for a missing token, without calling the database at all", async () => {
    const response = await GET({} as never, makeParams(""));
    expect(response.status).toBe(404);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("returns only the requesting token's events, built from exactly what the RPC returned", async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          source: "appointment",
          id: "11111111-1111-1111-1111-111111111111",
          title: "Dr. Owner",
          description: null,
          starts_at: "2026-06-15T14:00:00.000Z",
          due_date: null,
          location: null,
          created_at: "2026-06-01T00:00:00.000Z",
          updated_at: "2026-06-01T00:00:00.000Z",
        },
      ],
      error: null,
    });

    const response = await GET({} as never, makeParams("owners-token"));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain("SUMMARY:Appointment: Dr. Owner");
    expect(body).toContain("lifeos-appointment-11111111-1111-1111-1111-111111111111@lifeos.local");
  });

  it("never leaks a raw database error to the response body", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "relation calendar_feed_tokens does not exist" } });

    const response = await GET({} as never, makeParams("token"));
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(body).not.toContain("relation");
    expect(body).not.toContain("calendar_feed_tokens");
  });
});
