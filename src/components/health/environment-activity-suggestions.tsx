"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import type { Activity, ExercisePreferences } from "@/types/health/entities";
import { suggestActivitiesForEnvironment } from "@/lib/health/activity-library";

// Universal Exercise & Activity Library spec, Section 9: practical,
// environment-aware suggestions (no equipment + home -> bodyweight;
// outdoor -> walking/running/cycling; gym -> resistance training;
// limited mobility -> low-impact options; small space -> short
// bodyweight/mobility routines). Never assumes every user can perform
// every exercise, and never invents a suggestion when the user hasn't
// told LifeOS their context yet.
export function EnvironmentActivitySuggestions({ activities, preferences }: { activities: Activity[]; preferences: ExercisePreferences | null }) {
  const t = useTranslations("exercise.environmentSuggestions");
  const { locale } = useParams<{ locale: string }>();
  const isFr = locale === "fr";
  const environment = preferences?.environment ?? null;

  const suggestions = useMemo(
    () => (environment ? suggestActivitiesForEnvironment(activities, environment).slice(0, 8) : []),
    [activities, environment]
  );

  return (
    <section className="mb-8 rounded-card border border-surface bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <MapPin size={18} className="text-muted" />
        <h2 className="text-sm font-semibold text-secondary">{t("title")}</h2>
      </div>

      {!environment ? (
        <p className="text-sm text-muted">{t("noPreferenceSet")}</p>
      ) : (
        <>
          <p className="text-sm text-secondary">{t(`explanations.${environment}`)}</p>
          {suggestions.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {suggestions.map((activity) => (
                <span key={activity.id} className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs text-primary">
                  {isFr ? activity.name_fr : activity.name_en}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">{t("noMatches")}</p>
          )}
        </>
      )}
    </section>
  );
}
