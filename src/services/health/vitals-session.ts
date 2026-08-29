import { createClient } from "@/lib/supabase/server";
import type { Vital, BodyMetric, VitalEntrySource } from "@/types/health/entities";
import type { RecordVitalsInput } from "@/lib/validation/health";
import { computeBmi } from "@/lib/health/bmi";
import { createTimelineEvent } from "@/services/core/timeline";
import { UserFacingError } from "@/lib/errors";

export interface RecordVitalsResult {
  vitals: Vital[];
  bodyMetrics: BodyMetric[];
}

// Orchestrates the combined "Record Vitals" submission (Spec Section
// 4): any subset of measurements from one visit becomes one or more
// rows across `vitals` and `body_metrics` (reusing both existing
// tables — see 0019_vitals_extended.sql — never a new redundant table),
// plus exactly ONE timeline event summarizing the whole visit (Section
// 13: "Do not create duplicate timeline records for every individual
// measurement").
export async function recordVitalsSession(input: RecordVitalsInput): Promise<RecordVitalsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new UserFacingError("Not authenticated");

  const shared = {
    user_id: user.id,
    source: input.source as VitalEntrySource,
    source_document_id: input.source_document_id ?? null,
    related_appointment_id: input.related_appointment_id ?? null,
    related_condition_id: input.related_condition_id ?? null,
    notes: input.notes?.trim() || null,
  };

  const vitalRows: Record<string, unknown>[] = [];

  // Heart rate rides along as the blood-pressure reading's own pulse
  // when both are recorded in the same visit — never a second,
  // duplicate standalone heart_rate row for the same measurement.
  if (input.systolic !== undefined && input.diastolic !== undefined) {
    vitalRows.push({
      ...shared,
      vital_type: "blood_pressure",
      recorded_at: input.recorded_at,
      systolic: input.systolic,
      diastolic: input.diastolic,
      pulse: input.heart_rate ?? null,
    });
  } else if (input.heart_rate !== undefined) {
    vitalRows.push({
      ...shared,
      vital_type: "heart_rate",
      recorded_at: input.recorded_at,
      pulse: input.heart_rate,
      unit: "bpm",
    });
  }

  if (input.temperature_value !== undefined) {
    vitalRows.push({
      ...shared,
      vital_type: "temperature",
      recorded_at: input.recorded_at,
      value: input.temperature_value,
      unit: input.temperature_unit,
    });
  }
  if (input.respiratory_rate !== undefined) {
    vitalRows.push({
      ...shared,
      vital_type: "respiratory_rate",
      recorded_at: input.recorded_at,
      value: input.respiratory_rate,
      unit: "breaths/min",
    });
  }
  if (input.spo2 !== undefined) {
    vitalRows.push({
      ...shared,
      vital_type: "spo2",
      recorded_at: input.recorded_at,
      value: input.spo2,
      unit: "%",
    });
  }

  const bodyMetricRows: Record<string, unknown>[] = [];
  const sharedMetric = {
    user_id: user.id,
    entry_source: input.source,
    source_document_id: input.source_document_id ?? null,
    related_appointment_id: input.related_appointment_id ?? null,
    related_condition_id: input.related_condition_id ?? null,
    notes: input.notes?.trim() || null,
    measured_at: input.recorded_at,
  };

  if (input.weight_value !== undefined) {
    bodyMetricRows.push({ ...sharedMetric, metric_type: "weight", value: input.weight_value, unit: input.weight_unit, is_calculated: false });
  }
  if (input.height_value !== undefined) {
    bodyMetricRows.push({ ...sharedMetric, metric_type: "height", value: input.height_value, unit: input.height_unit, is_calculated: false });
  }
  // Section 6: only auto-compute BMI when both inputs are present in
  // THIS submission — never overwrite/duplicate an existing BMI row the
  // user (or an import) already recorded some other way.
  if (input.weight_value !== undefined && input.height_value !== undefined) {
    const bmi = computeBmi(input.weight_value, input.weight_unit, input.height_value, input.height_unit);
    bodyMetricRows.push({ ...sharedMetric, metric_type: "bmi", value: bmi, unit: "kg/m²", is_calculated: true });
  }

  if (vitalRows.length === 0 && bodyMetricRows.length === 0) {
    throw new UserFacingError("No measurements provided");
  }

  const [vitalsResult, bodyMetricsResult] = await Promise.all([
    vitalRows.length > 0
      ? supabase.from("vitals").insert(vitalRows).select()
      : Promise.resolve({ data: [] as Vital[], error: null }),
    bodyMetricRows.length > 0
      ? supabase.from("body_metrics").insert(bodyMetricRows).select()
      : Promise.resolve({ data: [] as BodyMetric[], error: null }),
  ]);

  if (vitalsResult.error) throw vitalsResult.error;
  if (bodyMetricsResult.error) throw bodyMetricsResult.error;

  const vitals = vitalsResult.data as Vital[];
  const bodyMetrics = bodyMetricsResult.data as BodyMetric[];

  await createTimelineEvent({
    event_type: "vitals_recorded",
    date_time: input.recorded_at,
    title: "Vitals recorded",
    description: buildVitalsSummary(vitals, bodyMetrics),
    domain: "health",
    // No related_entity_type/id — this one event can summarize several
    // rows across two tables, and the polymorphic-reference trigger
    // only ever validates a single (type, id) pair. A null pair skips
    // that validation entirely (see validate_timeline_related_entity()).
    related_entity_type: null,
    related_entity_id: null,
  });

  return { vitals, bodyMetrics };
}

function buildVitalsSummary(vitals: Vital[], bodyMetrics: BodyMetric[]): string {
  const parts: string[] = [];
  const bp = vitals.find((v) => v.vital_type === "blood_pressure");
  if (bp) parts.push(`${bp.systolic}/${bp.diastolic} mmHg`);
  const hr = vitals.find((v) => v.vital_type === "heart_rate");
  if (hr) parts.push(`${hr.pulse} bpm`);
  const temp = vitals.find((v) => v.vital_type === "temperature");
  if (temp) parts.push(`${temp.value}${temp.unit}`);
  const rr = vitals.find((v) => v.vital_type === "respiratory_rate");
  if (rr) parts.push(`${rr.value} ${rr.unit}`);
  const spo2 = vitals.find((v) => v.vital_type === "spo2");
  if (spo2) parts.push(`SpO2 ${spo2.value}%`);
  const weight = bodyMetrics.find((m) => m.metric_type === "weight");
  if (weight) parts.push(`${weight.value} ${weight.unit}`);

  return parts.join(" · ");
}
