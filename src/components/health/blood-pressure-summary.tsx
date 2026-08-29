import { getTranslations } from "next-intl/server";
import { HeartPulse } from "lucide-react";
import type { ReferenceStandard, Vital } from "@/types/health/entities";
import { getBloodPressureStatus } from "@/lib/health/blood-pressure";
import { resolveBloodPressureCategory } from "@/lib/health/reference-standards";
import { Badge } from "@/components/core/badge";
import { ClinicalThreshold } from "@/components/health/clinical-threshold";

const STATUS_BADGE_VARIANT = {
  normal: "normal",
  outside_range: "attention",
} as const;

function trendArrow(delta: number): string {
  if (delta > 0) return "↑";
  if (delta < 0) return "↓";
  return "–";
}

// Blood Pressure Dashboard spec: latest reading, previous reading,
// trend, and an average once there's enough history — all in one
// summary card, never a diagnosis (see lib/health/blood-pressure.ts).
// The AHA guideline category (Universal Reference System spec, Section
// 3) is a separate, clearly-labeled piece of information answering a
// different question ("where does this fall on a recognized clinical
// guideline?") from the personal-baseline "outside_range" comparison
// ("is this different from MY own recent readings?") — both are shown,
// neither replaces the other.
export async function BloodPressureSummary({
  readings,
  locale,
  referenceStandards,
}: {
  readings: Vital[];
  locale: string;
  referenceStandards: ReferenceStandard[];
}) {
  const t = await getTranslations("vitals.bloodPressure");

  const [latest, previous] = readings;
  // systolic/diastolic are guaranteed non-null for blood_pressure rows by
  // the DB constraint (0014_vitals.sql), but the shared Vital type keeps
  // them nullable for every other vital_type — narrow explicitly here.
  const status =
    latest && latest.systolic !== null && latest.diastolic !== null
      ? getBloodPressureStatus(
          { systolic: latest.systolic, diastolic: latest.diastolic },
          readings.slice(1).filter((r): r is Vital & { systolic: number; diastolic: number } => r.systolic !== null && r.diastolic !== null)
        )
      : null;

  const guidelineCategory =
    latest && latest.systolic !== null && latest.diastolic !== null
      ? resolveBloodPressureCategory(latest.systolic, latest.diastolic, referenceStandards)
      : null;

  const baselineSample = readings.slice(0, 10);
  const average =
    baselineSample.length >= 3
      ? {
          systolic: Math.round(baselineSample.reduce((sum, r) => sum + (r.systolic ?? 0), 0) / baselineSample.length),
          diastolic: Math.round(baselineSample.reduce((sum, r) => sum + (r.diastolic ?? 0), 0) / baselineSample.length),
        }
      : null;

  return (
    <div className="flex flex-col rounded-card border border-surface bg-white p-4">
      <div className="mb-2 flex items-center gap-2 text-muted">
        <HeartPulse size={18} />
        <p className="text-xs font-semibold uppercase tracking-wide">{t("sectionTitle")}</p>
      </div>

      {latest ? (
        <>
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="text-3xl font-semibold text-secondary">
              {latest.systolic} / {latest.diastolic} <span className="text-base font-normal text-muted">{t("unit")}</span>
            </p>
            {status && <Badge variant={STATUS_BADGE_VARIANT[status]}>{t(`status.${status}`)}</Badge>}
          </div>

          {previous && previous.systolic !== null && previous.diastolic !== null && latest.systolic !== null && latest.diastolic !== null && (
            <p className="mt-1 text-sm text-muted">
              {trendArrow(latest.systolic - previous.systolic)} {Math.abs(latest.systolic - previous.systolic)} /{" "}
              {trendArrow(latest.diastolic - previous.diastolic)} {Math.abs(latest.diastolic - previous.diastolic)} {t("unit")}{" "}
              {t("vsPrevious")}
            </p>
          )}

          {guidelineCategory && (
            <div className="mt-3">
              <ClinicalThreshold
                category={guidelineCategory.category}
                guidelineLabel={guidelineCategory.standard.source_name}
                standard={guidelineCategory.standard}
              />
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <p className="text-muted">
              {t("heartRate")}: <span className="font-medium text-secondary">{latest.pulse} {t("bpm")}</span>
            </p>
            {average && (
              <p className="text-muted">
                {t("average", { count: baselineSample.length })}:{" "}
                <span className="font-medium text-secondary">
                  {average.systolic} / {average.diastolic} {t("unit")}
                </span>
              </p>
            )}
          </div>

          <p className="mt-2 text-xs text-muted">
            {t("recorded")}: {new Date(latest.recorded_at).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
          </p>

          {status === "outside_range" && <p className="mt-2 text-xs text-muted">{t("disclaimer")}</p>}
        </>
      ) : (
        <p className="text-sm text-muted">{t("noReadings")}</p>
      )}

      {latest && (
        <a
          href="?tab=history"
          className="mt-4 inline-flex min-h-11 w-fit items-center text-xs font-medium text-primary hover:underline"
        >
          {t("viewHistory")} →
        </a>
      )}
    </div>
  );
}
