import { createClient } from "@/lib/supabase/server";
import type { Activity, ExercisePreferences, Workout } from "@/types/health/entities";

// Follows the Conditions pattern.

export async function listWorkouts(): Promise<Workout[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("workouts").select("*").order("started_at", { ascending: false });

  if (error) throw error;
  return data as Workout[];
}

export async function getWorkout(id: string): Promise<Workout | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("workouts").select("*").eq("id", id).maybeSingle();

  if (error) throw error;
  return data as Workout | null;
}

export async function createWorkout(
  input: Pick<Workout, "workout_type" | "started_at"> &
    Partial<Omit<Workout, "id" | "user_id" | "workout_type" | "started_at" | "created_at" | "updated_at">>
): Promise<Workout> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("workouts")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as Workout;
}

export async function updateWorkout(
  id: string,
  input: Partial<Omit<Workout, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<Workout> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("workouts").update(input).eq("id", id).select().single();

  if (error) throw error;
  return data as Workout;
}

export async function deleteWorkout(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("workouts").delete().eq("id", id);
  if (error) throw error;
}

// Universal Exercise & Activity Library — activities is shared/curated
// global content, same pattern as listMeals() over `meals`.
export async function listActivities(): Promise<Activity[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("activities").select("*").order("name_en", { ascending: true });
  if (error) throw error;
  return data as Activity[];
}

export async function getExercisePreferences(): Promise<ExercisePreferences | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("exercise_preferences").select("*").maybeSingle();
  if (error) throw error;
  return data as ExercisePreferences | null;
}

// Section 8: personalization only, never a medical prescription — one
// row per user, created on first save or updated on every subsequent
// one, same upsert pattern as upsertNutritionPreferences.
export async function upsertExercisePreferences(
  input: Partial<Omit<ExercisePreferences, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<ExercisePreferences> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("exercise_preferences")
    .upsert({ ...input, user_id: user.id }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) throw error;
  return data as ExercisePreferences;
}
