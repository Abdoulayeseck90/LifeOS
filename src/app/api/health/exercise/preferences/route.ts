import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exercisePreferencesInputSchema } from "@/lib/validation/health";
import { getExercisePreferences, upsertExercisePreferences } from "@/services/health/workouts";

// Universal Exercise & Activity Library, Section 8.

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const preferences = await getExercisePreferences();
    return NextResponse.json({ data: preferences });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load exercise preferences" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const parsed = exercisePreferencesInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const preferences = await upsertExercisePreferences(parsed.data);
    return NextResponse.json({ data: preferences }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to save exercise preferences" }, { status: 500 });
  }
}
