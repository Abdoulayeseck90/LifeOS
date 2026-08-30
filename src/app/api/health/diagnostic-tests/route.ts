import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { diagnosticTestInputSchema } from "@/lib/validation/health";
import { listDiagnosticTests, createDiagnosticTest } from "@/services/health/diagnostic-tests";
import { createTimelineEvent } from "@/services/core/timeline";

// Mirrors src/app/api/health/conditions/route.ts. ?type=fibroscan filters
// to one test_type — used by the dedicated FibroScan history view.

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const testType = new URL(request.url).searchParams.get("type") ?? undefined;

  try {
    const diagnosticTests = await listDiagnosticTests(testType);
    return NextResponse.json({ data: diagnosticTests });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load diagnostic tests" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = diagnosticTestInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const diagnosticTest = await createDiagnosticTest(parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "create",
      p_entity_type: "diagnostic_test",
      p_entity_id: diagnosticTest.id,
      p_metadata: null,
    });

    await createTimelineEvent({
      event_type: diagnosticTest.test_type,
      date_time: new Date(diagnosticTest.study_date).toISOString(),
      title: diagnosticTest.test_type,
      domain: "health",
      related_entity_type: "diagnostic_test",
      related_entity_id: diagnosticTest.id,
    });

    return NextResponse.json({ data: diagnosticTest }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create diagnostic test" }, { status: 500 });
  }
}
