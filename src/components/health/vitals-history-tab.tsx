import { getTranslations } from "next-intl/server";
import type { Appointment, BodyMetric, Condition, Vital } from "@/types/health/entities";
import type { DateRange } from "@/lib/dates/range";
import { DateRangeFilter } from "@/components/core/date-range-filter";
import { VitalsHistoryUnified } from "@/components/health/vitals-history-unified";
import { VitalHistory } from "@/components/health/vital-history";
import { BodyMetricCard } from "@/components/health/body-metric-card";
import { SINGLE_VALUE_VITAL_TYPES, type SingleValueVitalType } from "@/components/health/vital-type-config";

// Vitals redesign — History tab: the full filterable log, date-ranged
// via the shared LifeOS DateRangeFilter (Section 5 of the Nutrition
// redesign spec applies here too — reuse where it provides value).
// Same content that used to sit below the fold on the single-scroll
// page, unchanged logic, just relocated.
export async function VitalsHistoryTab({
  bloodPressureReadings,
  readingsByType,
  bodyMetrics,
  dateRange,
  conditions,
  appointments,
  filteredBodyMetrics,
  hasAnyOtherBodyMetrics,
}: {
  bloodPressureReadings: Vital[];
  readingsByType: Record<SingleValueVitalType, Vital[]>;
  bodyMetrics: BodyMetric[];
  dateRange: DateRange;
  conditions: Condition[];
  appointments: Appointment[];
  filteredBodyMetrics: BodyMetric[];
  hasAnyOtherBodyMetrics: boolean;
}) {
  const t = await getTranslations("vitals");

  return (
    <div>
      <DateRangeFilter quickRanges={["30d", "3m", "6m", "thisYear", "custom"]} />

      <VitalsHistoryUnified
        bloodPressureReadings={bloodPressureReadings}
        heartRateReadings={readingsByType.heart_rate}
        temperatureReadings={readingsByType.temperature}
        respiratoryRateReadings={readingsByType.respiratory_rate}
        spo2Readings={readingsByType.spo2}
        bodyMetrics={bodyMetrics}
        dateRange={dateRange}
        conditions={conditions}
        appointments={appointments}
      />

      <div className="flex flex-col gap-10">
        <VitalHistory vitalType="blood_pressure" readings={bloodPressureReadings} dateRange={dateRange} />

        {SINGLE_VALUE_VITAL_TYPES.filter((type) => readingsByType[type].length > 0).map((type) => (
          <VitalHistory key={type} vitalType={type} readings={readingsByType[type]} dateRange={dateRange} />
        ))}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("weightSectionTitle")}</h2>
          </div>

          {filteredBodyMetrics.length === 0 ? (
            <div className="rounded-card border border-dashed border-surface p-8 text-center">
              <p className="text-sm text-muted">{bodyMetrics.length === 0 ? t("weightEmpty") : t("weightNoResults")}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredBodyMetrics.map((metric) => (
                <BodyMetricCard key={metric.id} metric={metric} />
              ))}
            </div>
          )}
          {hasAnyOtherBodyMetrics && <p className="mt-3 text-xs text-muted">{t("otherBodyMetricsNote")}</p>}
        </section>
      </div>
    </div>
  );
}
