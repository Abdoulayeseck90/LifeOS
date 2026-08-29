import { getTranslations } from "next-intl/server";
import { listVitals } from "@/services/health/vitals";
import { listBodyMetrics } from "@/services/health/body-metrics";
import { listConditions } from "@/services/health/conditions";
import { listDocuments } from "@/services/core/documents";
import { listAppointments } from "@/services/health/appointments";
import { listReferenceStandardsForMetrics } from "@/services/health/reference-standards";
import type { DateRange } from "@/lib/dates/range";
import { VitalRecordButton } from "@/components/health/vital-record-button";
import { VitalSavedBanner } from "@/components/health/vital-saved-banner";
import { VitalsTabs } from "@/components/health/vitals-tabs";
import { VitalsOverviewTab } from "@/components/health/vitals-overview-tab";
import { VitalsHistoryTab } from "@/components/health/vitals-history-tab";

// The central home for measurable body readings (Master spec: "Do NOT
// create unnecessary separate pages for every vital sign"), reorganized
// into an Overview tab (latest readings + trend charts) and a History
// tab (date-ranged unified + per-type log) — same split Nutrition got,
// instead of one long stacked scroll. Weight/Height/BMI's data model is
// untouched (still body_metrics, reused rather than duplicated) — only
// their card/nav location moved. Per-user data behind auth — never
// statically prerendered.
export const dynamic = "force-dynamic";

export default async function VitalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; from?: string; to?: string }>;
}) {
  const { locale } = await params;
  const { from, to } = await searchParams;
  // Client-side filtering (VitalHistory / the body-metrics list below)
  // over the already-fetched full lists — the top "latest reading"
  // cards and the charts deliberately stay unfiltered (a date filter
  // narrowing history shouldn't make "latest" lie about what's actually
  // most recent, or hide data the chart's own separate range selector
  // is showing).
  const dateRange: DateRange = { from: from ?? null, to: to ?? null };
  const t = await getTranslations("vitals");

  const [
    bloodPressureReadings,
    heartRateReadings,
    spo2Readings,
    temperatureReadings,
    respiratoryRateReadings,
    bodyMetrics,
    conditions,
    documents,
    appointments,
    referenceStandards,
  ] = await Promise.all([
    listVitals("blood_pressure"),
    listVitals("heart_rate"),
    listVitals("spo2"),
    listVitals("temperature"),
    listVitals("respiratory_rate"),
    listBodyMetrics(),
    listConditions(),
    listDocuments(),
    listAppointments(),
    listReferenceStandardsForMetrics([
      "vital:blood_pressure",
      "vital:heart_rate",
      "vital:respiratory_rate",
      "vital:temperature",
      "vital:spo2",
      "body_metric:bmi",
    ]),
  ]);

  const readingsByType = {
    heart_rate: heartRateReadings,
    spo2: spo2Readings,
    temperature: temperatureReadings,
    respiratory_rate: respiratoryRateReadings,
  } as const;

  const bpChartEntries = [...bloodPressureReadings]
    .reverse()
    .map((r) => ({ date: r.recorded_at, systolic: r.systolic as number, diastolic: r.diastolic as number }));

  const heartRateChartEntries = [...heartRateReadings]
    .reverse()
    .map((r) => ({ date: r.recorded_at, value: r.pulse as number, unit: "bpm" }));
  const temperatureChartEntries = [...temperatureReadings]
    .reverse()
    .map((r) => ({ date: r.recorded_at, value: r.value as number, unit: r.unit ?? "" }));

  const weightEntries = bodyMetrics
    .filter((m) => m.metric_type === "weight")
    .sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime());
  const weightChartEntries = [...weightEntries]
    .reverse()
    .map((entry) => ({ date: entry.measured_at, value: entry.value, unit: entry.unit }));

  const hasAnyOtherBodyMetrics = bodyMetrics.some((m) => m.metric_type === "waist_circumference" || m.metric_type === "body_fat_percentage");

  const filteredBodyMetrics = bodyMetrics.filter((metric) => {
    const day = metric.measured_at.slice(0, 10);
    if (dateRange.from && day < dateRange.from) return false;
    if (dateRange.to && day > dateRange.to) return false;
    return true;
  });

  // Section 18: a brand-new user with nothing recorded yet gets one
  // clean empty state, not a grid of cards each individually saying
  // "no readings yet."
  const hasAnyVitalsData =
    bloodPressureReadings.length > 0 ||
    heartRateReadings.length > 0 ||
    spo2Readings.length > 0 ||
    temperatureReadings.length > 0 ||
    respiratoryRateReadings.length > 0 ||
    bodyMetrics.length > 0;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-secondary">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </div>
        <VitalRecordButton conditions={conditions} documents={documents} appointments={appointments} />
      </div>

      <VitalSavedBanner />

      {!hasAnyVitalsData ? (
        <div className="rounded-card border border-dashed border-surface p-8 text-center">
          <p className="text-sm text-muted">{t("empty")}</p>
          <div className="mt-3 flex justify-center">
            <VitalRecordButton conditions={conditions} documents={documents} appointments={appointments} />
          </div>
        </div>
      ) : (
        <VitalsTabs
          overview={
            <VitalsOverviewTab
              bloodPressureReadings={bloodPressureReadings}
              readingsByType={readingsByType}
              bodyMetrics={bodyMetrics}
              locale={locale}
              referenceStandards={referenceStandards}
              bpChartEntries={bpChartEntries}
              heartRateChartEntries={heartRateChartEntries}
              temperatureChartEntries={temperatureChartEntries}
              weightChartEntries={weightChartEntries}
            />
          }
          history={
            <VitalsHistoryTab
              bloodPressureReadings={bloodPressureReadings}
              readingsByType={readingsByType}
              bodyMetrics={bodyMetrics}
              dateRange={dateRange}
              conditions={conditions}
              appointments={appointments}
              filteredBodyMetrics={filteredBodyMetrics}
              hasAnyOtherBodyMetrics={hasAnyOtherBodyMetrics}
            />
          }
        />
      )}
    </div>
  );
}
