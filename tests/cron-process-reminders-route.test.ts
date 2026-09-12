import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { processDueRemindersGloballyMock } = vi.hoisted(() => ({ processDueRemindersGloballyMock: vi.fn() }));
vi.mock("@/services/core/reminders", () => ({
  processDueRemindersGlobally: processDueRemindersGloballyMock,
}));

import { GET } from "@/app/api/cron/process-reminders/route";

function makeRequest(authHeader?: string): Request {
  return new Request("https://example.com/api/cron/process-reminders", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

const ORIGINAL_SECRET = process.env.CRON_SECRET;

describe("GET /api/cron/process-reminders", () => {
  beforeEach(() => {
    processDueRemindersGloballyMock.mockReset();
    process.env.CRON_SECRET = "test-secret";
  });

  afterEach(() => {
    process.env.CRON_SECRET = ORIGINAL_SECRET;
  });

  it("returns 500 and does not run the sweep when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const response = await GET(makeRequest("Bearer anything"));
    expect(response.status).toBe(500);
    expect(processDueRemindersGloballyMock).not.toHaveBeenCalled();
  });

  it("returns 401 with no Authorization header", async () => {
    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
    expect(processDueRemindersGloballyMock).not.toHaveBeenCalled();
  });

  it("returns 401 with the wrong secret", async () => {
    const response = await GET(makeRequest("Bearer wrong-secret"));
    expect(response.status).toBe(401);
    expect(processDueRemindersGloballyMock).not.toHaveBeenCalled();
  });

  it("runs the sweep and returns its result with the correct secret", async () => {
    processDueRemindersGloballyMock.mockResolvedValue({ processed: 3, failed: 1 });

    const response = await GET(makeRequest("Bearer test-secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ processed: 3, failed: 1 });
    expect(processDueRemindersGloballyMock).toHaveBeenCalledTimes(1);
  });

  it("never leaks a raw error message to the response body on failure", async () => {
    processDueRemindersGloballyMock.mockRejectedValue(new Error("relation reminders does not exist"));

    const response = await GET(makeRequest("Bearer test-secret"));
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(body).not.toContain("relation");
    expect(body).not.toContain("reminders does not exist");
  });
});
