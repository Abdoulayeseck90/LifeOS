import { createClient } from "@/lib/supabase/server";
import type { ReferenceStandard } from "@/types/health/entities";

// Universal Reference System spec — the shared, curated reference
// catalog (Section 12: "do not build separate reference-range logic
// for every page"). Labs looks this table up by test_definition_id
// (services/health/labs.ts, unchanged); every other module (Vitals,
// body metrics, future modules) looks it up by metric_key instead —
// this is the generic entry point for that side. Never written to by
// the app itself; curated only via migration/seed.
export async function listReferenceStandardsForMetric(metricKey: string): Promise<ReferenceStandard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("reference_standards").select("*").eq("metric_key", metricKey);

  if (error) throw error;
  return data as ReferenceStandard[];
}

// For pages that need several metrics' worth of standards in one
// round-trip (e.g. the Vitals dashboard showing HR/RR/Temp/SpO2/BP/BMI
// all at once) rather than one query per card.
export async function listReferenceStandardsForMetrics(metricKeys: string[]): Promise<ReferenceStandard[]> {
  if (metricKeys.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("reference_standards").select("*").in("metric_key", metricKeys);

  if (error) throw error;
  return data as ReferenceStandard[];
}
