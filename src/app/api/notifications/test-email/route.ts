import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getEmailSender, buildTestEmail } from "@/services/core/email";

// Settings → Notifications → "Send Test Email". Sends to the signed-in
// user's own address (from Supabase auth, never client-supplied) via
// the same getEmailSender() path every real reminder email uses, so a
// success here is a genuine end-to-end confirmation of RESEND_API_KEY /
// RESEND_FROM_EMAIL, not a separate code path that could drift from
// what reminders actually do.
export async function POST() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!user.email) {
    return NextResponse.json({ error: "Your account has no email address on file" }, { status: 400 });
  }

  const configured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
  if (!configured) {
    return NextResponse.json(
      { error: "Email sending isn't configured yet (RESEND_API_KEY / RESEND_FROM_EMAIL missing)" },
      { status: 503 }
    );
  }

  try {
    await getEmailSender().send({ to: user.email, ...buildTestEmail() });
    return NextResponse.json({ data: { sentTo: user.email } });
  } catch (err) {
    // The underlying sender already logged the Resend-side error detail
    // (see email.ts) — this log just marks that a test-email request hit
    // this specific route, no error internals repeated/exposed to the client.
    console.error("[email] Test email request failed");
    return NextResponse.json({ error: "Failed to send test email" }, { status: 500 });
  }
}
