"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { HeartPulse, Trophy, Dumbbell, StretchHorizontal, Footprints, Dumbbell as LibraryIcon } from "lucide-react";
import type { Activity, ActivityCategory, ExercisePreferences } from "@/types/health/entities";
import { groupActivitiesByCategory, filterActivitiesByEquipment } from "@/lib/health/activity-library";
import { LifeOSCheckbox } from "@/components/core/form/lifeos-checkbox";

const CATEGORY_ICON: Record<ActivityCategory, typeof HeartPulse> = {
  cardio: HeartPulse,
  sports: Trophy,
  strength: Dumbbell,
  mobility_flexibility: StretchHorizontal,
  daily_activity: Footprints,
};

// Universal Exercise & Activity Library spec, Section 8/10: a global,
// browsable library grouped into the spec's 5 fixed categories — never
// hard-coded to one country's activities. The equipment filter is
// opt-in ("show only what I can do") rather than a default
// restriction, matching Section 8's "do not assume access to a gym or
// specialized equipment" instruction in the other direction too — an
// unfiltered view never hides an activity just because equipment
// preferences haven't been set.
export function ActivityLibrary({ activities, preferences }: { activities: Activity[]; preferences: ExercisePreferences | null }) {
  const t = useTranslations("exercise.activityLibrary");
  const { locale } = useParams<{ locale: string }>();
  const isFr = locale === "fr";
  const [filterByEquipment, setFilterByEquipment] = useState(false);

  const hasEquipmentPreferences = (preferences?.equipment.length ?? 0) > 0;
  const visibleActivities = useMemo(
    () => (filterByEquipment && hasEquipmentPreferences ? filterActivitiesByEquipment(activities, preferences!.equipment) : activities),
    [activities, filterByEquipment, hasEquipmentPreferences, preferences]
  );
  const grouped = useMemo(() => groupActivitiesByCategory(visibleActivities), [visibleActivities]);

  return (
    <section className="mb-8 rounded-card border border-surface bg-white p-4">
      <div className="mb-1 flex items-center gap-2">
        <LibraryIcon size={18} className="text-muted" />
        <h2 className="text-sm font-semibold text-secondary">{t("title")}</h2>
      </div>
      <p className="text-xs text-muted">{t("subtitle")}</p>

      {hasEquipmentPreferences && (
        <div className="mt-3">
          <LifeOSCheckbox label={t("filterByEquipment")} checked={filterByEquipment} onChange={(e) => setFilterByEquipment(e.target.checked)} />
        </div>
      )}

      <div className="mt-4 flex flex-col gap-5">
        {grouped.map(({ category, activities: categoryActivities }) => {
          if (categoryActivities.length === 0) return null;
          const Icon = CATEGORY_ICON[category];
          return (
            <div key={category}>
              <div className="mb-2 flex items-center gap-1.5">
                <Icon size={15} className="text-primary" />
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t(`categories.${category}`)}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {categoryActivities.map((activity) => (
                  <span key={activity.id} className="rounded-full border border-surface bg-surface/50 px-2.5 py-1 text-xs text-secondary">
                    {isFr ? activity.name_fr : activity.name_en}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
