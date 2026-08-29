import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { workoutInputSchema } from "@/lib/validation/health";
import { listWorkouts, createWorkout } from "@/services/health/workouts";
import { createTimelineEvent } from "@/services/core/timeline";

// Mirrors src/app/api/health/conditions/route.ts. No
// createGeneralActivityNotification call here — that helper is
// deliberately scoped to its existing 4 named creation points (lab
// result, document, symptom, weight); workouts aren't one of them.

const WORKOUT_TITLES: Record<string, string> = {
  walking: "Walking workout logged",
  running: "Running workout logged",
  cycling: "Cycling workout logged",
  strength: "Strength workout logged",
  other: "Workout logged",
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const workouts = await listWorkouts();
    return NextResponse.json({ data: workouts });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load workouts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = workoutInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const workout = await createWorkout(parsed.data);

    await supabase.rpc("write_audit_event", {
      p_actor: user.id,
      p_action: "create",
      p_entity_type: "workout",
      p_entity_id: workout.id,
      p_metadata: null,
    });

    await createTimelineEvent({
      event_type: "workout",
      date_time: workout.started_at,
      title: WORKOUT_TITLES[workout.workout_type] ?? "Workout logged",
      domain: "health",
      related_entity_type: "workout",
      related_entity_id: workout.id,
    });

    return NextResponse.json({ data: workout }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create workout" }, { status: 500 });
  }
}
