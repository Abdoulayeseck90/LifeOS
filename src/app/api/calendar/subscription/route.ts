import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getCalendarFeedStatus, regenerateCalendarFeedToken } from "@/services/core/calendar-feed";

// Settings -> Calendar -> Apple Calendar. GET reports whether a link
// already exists (never the link itself — it isn't stored anywhere to
// return). POST (re)generates one; the response is the only time the
// full subscription URL is ever available server-side.
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const status = await getCalendarFeedStatus();
    return NextResponse.json({ data: status });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load calendar subscription status" }, { status: 500 });
  }
}

export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { token, createdAt } = await regenerateCalendarFeedToken();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return NextResponse.json({ data: { url: `${appUrl}/api/calendar/feed/${token}`, createdAt } });
  } catch (err) {
    return NextResponse.json({ error: "Failed to generate calendar link" }, { status: 500 });
  }
}
