"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Vital, BodyMetric, Condition, Appointment } from "@/types/health/entities";
import type { DateRange } from "@/lib/dates/range";
import { DocumentViewLink } from "@/components/health/document-view-link";

interface DayGroup {
  date: string;
  bloodPressure?: Vital;
  heartRate?: Vital;
  temperature?: Vital;
  respiratoryRate?: Vital;
  spo2?: Vital;
  weight?: BodyMetric;
  bmi?: BodyMetric;
  sourceDocumentId?: string | null;
  relatedAppointmentId?: string | null;
  relatedConditionId?: string | null;
}

function latestByDate<T extends { id: string }>(rows: T[], dateOf: (row: T) => string): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    const day = dateOf(row).slice(0, 10);
    const existing = map.get(day);
    if (!existing || dateOf(row) > dateOf(existing)) map.set(day, row);
  }
  return map;
}

// One row per date, every vital recorded that visit shown together
// (Spec Section 7) — distinct from the per-type History sections
// further down the page, which stay for anyone drilling into a single
// vital's full history. If more than one reading of the same type
// happened on the same date, only the latest is shown in this summary
// row (the per-type history below still has all of them).
export function VitalsHistoryUnified({
  bloodPressureReadings,
  heartRateReadings,
  temperatureReadings,
  respiratoryRateReadings,
  spo2Readings,
  bodyMetrics,
  dateRange,
  conditions,
  appointments,
}: {
  bloodPressureReadings: Vital[];
  heartRateReadings: Vital[];
  temperatureReadings: Vital[];
  respiratoryRateReadings: Vital[];
  spo2Readings: Vital[];
  bodyMetrics: BodyMetric[];
  dateRange: DateRange;
  conditions: Condition[];
  appointments: Appointment[];
}) {
  const t = useTranslations("vitals");
  const tHistory = useTranslations("vitals.history");
  const { locale } = useParams<{ locale: string }>();

  const groups = useMemo(() => {
    const byType = {
      bloodPressure: latestByDate(bloodPressureReadings, (v) => v.recorded_at),
      heartRate: latestByDate(heartRateReadings, (v) => v.recorded_at),
      temperature: latestByDate(temperatureReadings, (v) => v.recorded_at),
      respiratoryRate: latestByDate(respiratoryRateReadings, (v) => v.recorded_at),
      spo2: latestByDate(spo2Readings, (v) => v.recorded_at),
    };
    const weightByDate = latestByDate(
      bodyMetrics.filter((m) => m.metric_type === "weight"),
      (m) => m.measured_at
    );
    const bmiByDate = latestByDate(
      bodyMetrics.filter((m) => m.metric_type === "bmi"),
      (m) => m.measured_at
    );

    const allDates = new Set<string>([
      ...byType.bloodPressure.keys(),
      ...byType.heartRate.keys(),
      ...byType.temperature.keys(),
      ...byType.respiratoryRate.keys(),
      ...byType.spo2.keys(),
      ...weightByDate.keys(),
      ...bmiByDate.keys(),
    ]);

    const result: DayGroup[] = [];
    for (const date of allDates) {
      if (dateRange.from && date < dateRange.from) continue;
      if (dateRange.to && date > dateRange.to) continue;

      const bloodPressure = byType.bloodPressure.get(date);
      const heartRate = byType.heartRate.get(date);
      const temperature = byType.temperature.get(date);
      const respiratoryRate = byType.respiratoryRate.get(date);
      const spo2 = byType.spo2.get(date);
      const weight = weightByDate.get(date);
      const bmi = bmiByDate.get(date);

      const sourceDocumentId =
        bloodPressure?.source_document_id ?? heartRate?.source_document_id ?? weight?.source_document_id ?? null;
      const relatedAppointmentId =
        bloodPressure?.related_appointment_id ?? heartRate?.related_appointment_id ?? weight?.related_appointment_id ?? null;
      const relatedConditionId =
        bloodPressure?.related_condition_id ?? heartRate?.related_condition_id ?? weight?.related_condition_id ?? null;

      result.push({ date, bloodPressure, heartRate, temperature, respiratoryRate, spo2, weight, bmi, sourceDocumentId, relatedAppointmentId, relatedConditionId });
    }

    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [bloodPressureReadings, heartRateReadings, temperatureReadings, respiratoryRateReadings, spo2Readings, bodyMetrics, dateRange]);

  if (groups.length === 0) {
    return (
      <section id="vitals-history-unified" className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t("historyTitle")}</h2>
        <div className="rounded-card border border-dashed border-surface p-8 text-center">
          <p className="text-sm text-muted">{tHistory("noResults")}</p>
        </div>
      </section>
    );
  }

  return (
    <section id="vitals-history-unified" className="mb-10">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t("historyTitle")}</h2>
      <div className="flex flex-col gap-3">
        {groups.map((group) => {
          const parts: string[] = [];
          if (group.bloodPressure) parts.push(`${group.bloodPressure.systolic}/${group.bloodPressure.diastolic} mmHg`);
          if (group.heartRate) parts.push(`${group.heartRate.pulse} bpm`);
          if (group.respiratoryRate) parts.push(`${group.respiratoryRate.value} ${group.respiratoryRate.unit}`);
          if (group.temperature) parts.push(`${group.temperature.value}${group.temperature.unit}`);
          if (group.spo2) parts.push(`SpO2 ${group.spo2.value}%`);
          if (group.weight) parts.push(`${group.weight.value} ${group.weight.unit}`);
          if (group.bmi) parts.push(`BMI ${group.bmi.value}`);

          const condition = conditions.find((c) => c.id === group.relatedConditionId);
          const appointment = appointments.find((a) => a.id === group.relatedAppointmentId);

          return (
            <div key={group.date} className="rounded-card border border-surface bg-white p-4">
              <p className="text-sm font-medium text-secondary">
                {new Date(group.date).toLocaleDateString(locale, { dateStyle: "medium" })}
              </p>
              <p className="mt-1 text-sm text-secondary">{parts.join(" · ")}</p>
              {(condition || appointment || group.sourceDocumentId) && (
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                  {condition && <span>{t("relatedCondition")}: {condition.name}</span>}
                  {appointment && <span>{appointment.provider_name}</span>}
                  {group.sourceDocumentId && <DocumentViewLink documentId={group.sourceDocumentId} />}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
