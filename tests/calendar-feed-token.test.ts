import { describe, it, expect } from "vitest";
import { generateCalendarFeedToken, hashCalendarFeedToken } from "@/lib/calendar/feed-token";

describe("calendar feed token", () => {
  it("generates a 256-bit (32-byte) random token", () => {
    const token = generateCalendarFeedToken();
    const decoded = Buffer.from(token, "base64url");
    expect(decoded.length).toBe(32);
  });

  it("generates a different token on every call", () => {
    const a = generateCalendarFeedToken();
    const b = generateCalendarFeedToken();
    expect(a).not.toBe(b);
  });

  it("hashes to a 64-character lowercase hex SHA-256 digest", () => {
    const hash = hashCalendarFeedToken("some-token-value");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hashing is deterministic for the same input", () => {
    const token = generateCalendarFeedToken();
    expect(hashCalendarFeedToken(token)).toBe(hashCalendarFeedToken(token));
  });

  it("different tokens hash to different values", () => {
    const a = generateCalendarFeedToken();
    const b = generateCalendarFeedToken();
    expect(hashCalendarFeedToken(a)).not.toBe(hashCalendarFeedToken(b));
  });

  it("never stores the raw token as its own hash", () => {
    const token = generateCalendarFeedToken();
    expect(hashCalendarFeedToken(token)).not.toBe(token);
  });
});
