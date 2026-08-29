import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hydrationLogEntryInputSchema } from "@/lib/validation/health";
import { listHydrationLogEntries, addHydrationLogEntry } from "@/services/health/nutrition";

// Hydration & Drinks, Section 28.

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const entries = await listHydrationLogEntries();
    return NextResponse.json({ data: entries });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load hydration log" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const parsed = hydrationLogEntryInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const entry = await addHydrationLogEntry(parsed.data);
    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to log drink" }, { status: 500 });
  }
}
