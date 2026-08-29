import { getTranslations } from "next-intl/server";
import type { BodyMetric, ReferenceStandard } from "@/types/health/entities";
import { InfoCard } from "@/components/core/info-card";
import { TrendIndicator } from "@/components/core/trend-indicator";
import { VITAL_TYPE_ICON } from "@/components/health/vital-type-config";
import { resolveBmiCategory } from "@/lib/health/reference-standards";
import { ClinicalThreshold } from "@/components/health/clinical-threshold";

// Compact "latest reading" card for Weight/Height/BMI, reusing the
// already-existing body_metrics data (no duplicate storage — see
// vital-type-config.tsx). Weight keeps its established up-is-attention/
// down-is-normal color convention (already in use elsewhere in the
// app); Height/BMI trend is shown neutrally since there's no
// established "better direction" for either.
export async function BodyMetricLatestCard({
  metricType,
  metrics,
  locale,
  referenceStandards,
}: {
  metricType: "weight" | "height" | "bmi";
  metrics: BodyMetric[];
  locale: string;
  // Only ever populated for bmi — Weight/Height deliberately have no
  // reference standards to look up (Universal Reference System spec,
  // Sections 9/10: no fake "normal weight/height," trend/change only).
  referenceStandards: ReferenceStandard[];
}) {
  const t = await getTranslations("vitals");
  const tType = await getTranslations(`vitals.types.${metricType}`);
  const tReference = await getTranslations("reference");
  const Icon = VITAL_TYPE_ICON[metricType];

  const entries = metrics
    .filter((m) => m.metric_type === metricType)
    .sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime());
  const [latest, previous] = entries;
  const delta = latest && previous ? Math.round((latest.value - previous.value) * 10) / 10 : null;

  const bmiCategory = metricType === "bmi" && latest ? resolveBmiCategory(latest.value, referenceStandards) : null;

  return (
    <InfoCard icon={Icon} label={tType("label")} action={{ label: t("history.viewHistory"), href: "?tab=history" }}>
      {latest ? (
        <>
          <p className="text-2xl font-semibold text-secondary">
            {latest.value} <span className="text-sm font-normal text-muted">{latest.unit}</span>
          </p>
          {delta !== null && delta !== 0 && (
            <TrendIndicator
              delta={delta}
              unit={latest.unit}
              caption={t("sinceLastMeasurement")}
              colorConvention={metricType === "weight" ? "downIsPositive" : "neutral"}
            />
          )}
          <p className="mt-1 text-xs text-muted">
            {new Date(latest.measured_at).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
          </p>
          {bmiCategory && (
            <div className="mt-2">
              <ClinicalThreshold category={bmiCategory.category} guidelineLabel={bmiCategory.standard.source_name} standard={bmiCategory.standard} />
            </div>
          )}
          {metricType === "bmi" && !bmiCategory && <p className="mt-2 text-xs text-muted">{tReference("notAvailable")}</p>}
        </>
      ) : (
        <p className="text-sm text-muted">{tType("noReadings")}</p>
      )}
    </InfoCard>
  );
}
