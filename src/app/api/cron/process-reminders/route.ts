import { NextResponse } from "next/server";
import { processDueRemindersGlobally } from "@/services/core/reminders";

export const dynamic = "force-dynamic";

// The actual background-push trigger: called on a schedule by something
// outside any user's browser (a GitHub Actions workflow —
// .github/workflows/process-reminders-cron.yml — or, on a Vercel plan that
// supports frequent Cron Jobs, a `crons` entry in vercel.json pointing
// here instead). This route has no session/cookies at all, so it never
// authenticates as a specific user — CRON_SECRET is the only thing gating
// it, matching Vercel Cron's own documented pattern of sending
// `Authorization: Bearer $CRON_SECRET`.
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.error("[cron] CRON_SECRET is not configured — refusing to run process-reminders");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processDueRemindersGlobally();
    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("[cron] process-reminders failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Failed to process reminders" }, { status: 500 });
  }
}
