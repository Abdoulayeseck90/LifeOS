import type { BodyMetric, ReferenceStandard, Vital } from "@/types/health/entities";
import { BloodPressureSummary } from "@/components/health/blood-pressure-summary";
import { BloodPressureChart } from "@/components/health/blood-pressure-chart";
import { VitalLatestCard } from "@/components/health/vital-latest-card";
import { BodyMetricLatestCard } from "@/components/health/body-metric-latest-card";
import { WeightTrendChart } from "@/components/health/weight-trend-chart";
import { SingleValueTrendChart } from "@/components/health/single-value-trend-chart";
import { SINGLE_VALUE_VITAL_TYPES, type SingleValueVitalType } from "@/components/health/vital-type-config";

// Vitals redesign — Overview tab: "what's my status right now." Latest
// -reading cards + trend charts only, no raw history list (that's the
// History tab). Trend charts stay behind a >=2-reading gate, same as
// before the redesign — a single point isn't a trend.
export function VitalsOverviewTab({
  bloodPressureReadings,
  readingsByType,
  bodyMetrics,
  locale,
  referenceStandards,
  bpChartEntries,
  heartRateChartEntries,
  temperatureChartEntries,
  weightChartEntries,
}: {
  bloodPressureReadings: Vital[];
  readingsByType: Record<SingleValueVitalType, Vital[]>;
  bodyMetrics: BodyMetric[];
  locale: string;
  referenceStandards: ReferenceStandard[];
  bpChartEntries: { date: string; systolic: number; diastolic: number }[];
  heartRateChartEntries: { date: string; value: number; unit: string }[];
  temperatureChartEntries: { date: string; value: number; unit: string }[];
  weightChartEntries: { date: string; value: number; unit: string }[];
}) {
  return (
    <div>
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BloodPressureSummary
          readings={bloodPressureReadings}
          locale={locale}
          referenceStandards={referenceStandards.filter((s) => s.metric_key === "vital:blood_pressure")}
        />
        {SINGLE_VALUE_VITAL_TYPES.filter((type) => readingsByType[type].length > 0).map((type) => (
          <VitalLatestCard
            key={type}
            vitalType={type}
            readings={readingsByType[type]}
            locale={locale}
            referenceStandards={referenceStandards.filter((s) => s.metric_key === `vital:${type}`)}
          />
        ))}
        <BodyMetricLatestCard metricType="weight" metrics={bodyMetrics} locale={locale} referenceStandards={[]} />
        <BodyMetricLatestCard metricType="height" metrics={bodyMetrics} locale={locale} referenceStandards={[]} />
        <BodyMetricLatestCard
          metricType="bmi"
          metrics={bodyMetrics}
          locale={locale}
          referenceStandards={referenceStandards.filter((s) => s.metric_key === "body_metric:bmi")}
        />
      </div>

      <div className="flex flex-col gap-10">
        {bpChartEntries.length >= 2 && <BloodPressureChart entries={bpChartEntries} />}
        {heartRateChartEntries.length >= 2 && <SingleValueTrendChart entries={heartRateChartEntries} />}
        {temperatureChartEntries.length >= 2 && <SingleValueTrendChart entries={temperatureChartEntries} />}
        {weightChartEntries.length >= 2 && <WeightTrendChart entries={weightChartEntries} />}
      </div>
    </div>
  );
}
