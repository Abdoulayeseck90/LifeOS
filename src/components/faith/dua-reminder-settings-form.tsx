"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { DuaReminderScheduleType, DuaReminderSetting } from "@/types/core/entities";
import { LifeOSCheckbox } from "@/components/core/form/lifeos-checkbox";
import { LifeOSInput } from "@/components/core/form/lifeos-input";

const ORDER: DuaReminderScheduleType[] = ["morning", "evening", "before_sleep"];

// Section 14: enable/disable + change time, per named block — the
// existing centralized notification system delivers these (push
// preferred), no separate reminder architecture.
export function DuaReminderSettingsForm({ settings }: { settings: DuaReminderSetting[] }) {
  const t = useTranslations("faith.dua");
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function handleChange(scheduleType: DuaReminderScheduleType, enabled: boolean, timeOfDay: string) {
    setPending(scheduleType);

    await fetch("/api/faith/reminder-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schedule_type: scheduleType, enabled, time_of_day: timeOfDay }),
    });

    setPending(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col divide-y divide-surface rounded-card border border-surface bg-white">
      {ORDER.map((scheduleType) => {
        const setting = settings.find((s) => s.schedule_type === scheduleType);
        const enabled = setting?.enabled ?? false;
        const timeOfDay = setting?.time_of_day?.slice(0, 5) ?? "08:00";

        return (
          <div key={scheduleType} className="flex items-center justify-between gap-4 p-3">
            <LifeOSCheckbox
              label={t(`scheduleTypes.${scheduleType}`)}
              checked={enabled}
              disabled={pending === scheduleType}
              onChange={(e) => handleChange(scheduleType, e.target.checked, timeOfDay)}
            />
            <LifeOSInput
              type="time"
              value={timeOfDay}
              disabled={!enabled || pending === scheduleType}
              onChange={(e) => handleChange(scheduleType, enabled, e.target.value)}
              className="w-32"
            />
          </div>
        );
      })}
    </div>
  );
}
