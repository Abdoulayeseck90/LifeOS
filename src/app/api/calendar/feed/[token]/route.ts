import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hashCalendarFeedToken } from "@/lib/calendar/feed-token";
import { buildIcsFeed, type CalendarFeedEvent } from "@/lib/calendar/ics";

// The one route in this app that is deliberately unauthenticated —
// Apple Calendar's subscription fetcher never carries a Supabase session
// cookie, so the token in the URL *is* the credential. Never uses
// getAuthenticatedUser()/auth.getUser() for that reason.
//
// Calls exactly one RPC, get_calendar_feed_events(p_token_hash) —
// resolves the owning user and fetches their events in a single
// SECURITY DEFINER function (0043_calendar_feed.sql). This route must
// never resolve a user_id itself and must never pass one to the
// database — doing so would recreate the exact cross-user-access bug a
// security review caught before this migration was ever applied: a
// separate user_id-accepting function is trivially callable by anyone
// holding only the public anon key, bypassing the token entirely.
//
// An invalid, revoked, and genuinely-empty-but-valid token all produce
// zero rows from the database — indistinguishable by design (Section
// 16: the response must never give an attacker a way to tell "wrong
// token" apart from "right token, nothing scheduled"). Zero rows still
// renders as a valid (empty) VCALENDAR with 200, not a 404 — a 404 would
// incorrectly treat a legitimate subscriber with no events yet as an
// error, and a 200 tells a token-guessing attacker nothing they could
// use to distinguish a real account from a wrong guess.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token) {
    return new NextResponse("Not found", { status: 404 });
  }

  const supabase = await createClient();
  const tokenHash = hashCalendarFeedToken(token);

  const { data: rows, error } = await supabase.rpc("get_calendar_feed_events", {
    p_token_hash: tokenHash,
  });

  if (error) {
    console.error("[calendar-feed] Failed to load events:", error.message);
    return new NextResponse("Internal error", { status: 500 });
  }

  const events: CalendarFeedEvent[] = ((rows ?? []) as Record<string, unknown>[]).map((row) => ({
    source: row.source as "appointment" | "monitoring",
    id: row.id as string,
    title: row.source === "appointment" ? `Appointment: ${row.title as string}` : (row.title as string),
    description: (row.description as string | null) ?? null,
    startsAt: (row.starts_at as string | null) ?? null,
    dueDate: (row.due_date as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));

  const ics = buildIcsFeed(events);

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      // Apple Calendar polls subscribed calendars on its own schedule
      // (typically every few hours), so a short private cache is enough
      // to absorb repeat fetches without ever serving stale-for-long data.
      "Cache-Control": "private, max-age=900",
      "Content-Disposition": 'inline; filename="lifeos.ics"',
    },
  });
}
