import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nutritionPreferencesInputSchema } from "@/lib/validation/health";
import { getNutritionPreferences, upsertNutritionPreferences } from "@/services/health/nutrition";

// Senegal-Focused Liver-Conscious Nutrition System, Section 20.

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const preferences = await getNutritionPreferences();
    return NextResponse.json({ data: preferences });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load nutrition preferences" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const parsed = nutritionPreferencesInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const preferences = await upsertNutritionPreferences(parsed.data);
    return NextResponse.json({ data: preferences }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to save nutrition preferences" }, { status: 500 });
  }
}
