import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { duaReminderSettingUpdateSchema } from "@/lib/validation/core";
import { listDuaReminderSettings, updateDuaReminderSetting } from "@/services/core/dua-reminder-settings";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const settings = await listDuaReminderSettings();
    return NextResponse.json({ data: settings });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load reminder settings" }, { status: 500 });
  }
}

// One reminder time per named block (Section 14) — enabling/disabling
// or changing the time here is picked up the next time
// ensureDailyDuaReminders runs (every authenticated page load), the same
// interim-sweep pattern every other reminder category already uses.
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = duaReminderSettingUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const setting = await updateDuaReminderSetting(parsed.data.schedule_type, {
      enabled: parsed.data.enabled,
      time_of_day: parsed.data.time_of_day,
    });

    return NextResponse.json({ data: setting });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update reminder setting" }, { status: 500 });
  }
}
