import { randomBytes, createHash } from "crypto";

// 256 bits of entropy, base64url-encoded — long enough that guessing it
// is not a realistic attack, so the token itself (not a rate limiter) is
// the actual defense here. Node's built-in crypto module, no dependency.
export function generateCalendarFeedToken(): string {
  return randomBytes(32).toString("base64url");
}

// Only the hash is ever stored (0043_calendar_feed.sql) — this must stay
// a pure, deterministic function of the token so the feed route can
// re-derive the same hash to look it up, without ever persisting the
// raw token anywhere.
export function hashCalendarFeedToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
