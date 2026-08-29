"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { DuaScheduleType } from "@/types/core/entities";
import { LifeOSSelect } from "@/components/core/form/lifeos-select";

const SCHEDULE_TYPES: DuaScheduleType[] = ["morning", "evening", "before_sleep", "daily", "custom"];

// Section 9: add a recommended or personal Dua to Morning/Evening/
// Before Sleep/Daily/Custom — a single-field action, no separate
// confirm step needed.
export function AddToRoutineButton({ duaId }: { duaId: string }) {
  const t = useTranslations("faith.dua");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleChange(scheduleType: DuaScheduleType) {
    setSubmitting(true);

    const response = await fetch("/api/faith/routines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dua_id: duaId, schedule_type: scheduleType }),
    });

    setSubmitting(false);
    if (response.ok) router.refresh();
  }

  return (
    <LifeOSSelect
      value=""
      disabled={submitting}
      onChange={(e) => e.target.value && handleChange(e.target.value as DuaScheduleType)}
      aria-label={t("addToRoutine")}
      className="max-w-[220px]"
    >
      <option value="">{t("addToRoutine")}</option>
      {SCHEDULE_TYPES.map((type) => (
        <option key={type} value={type}>
          {t(`scheduleTypes.${type}`)}
        </option>
      ))}
    </LifeOSSelect>
  );
}
