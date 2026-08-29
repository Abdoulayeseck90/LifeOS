import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { customTestDefinitionInputSchema } from "@/lib/validation/health";
import { createCustomTestDefinition } from "@/services/health/labs";

// Expand Lab Test Selection spec, Section 13/17: creates a user-owned
// custom test definition from the "+ Add other test" / "+ Add custom
// test" flow in the test picker. Mirrors src/app/api/health/conditions/route.ts.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = customTestDefinitionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const testDefinition = await createCustomTestDefinition(parsed.data);
    return NextResponse.json({ data: testDefinition }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create custom test" }, { status: 500 });
  }
}
