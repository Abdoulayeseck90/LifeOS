import { getTranslations } from "next-intl/server";
import type { ReferenceStandard, Vital } from "@/types/health/entities";
import { InfoCard } from "@/components/core/info-card";
import { TrendIndicator } from "@/components/core/trend-indicator";
import { VITAL_TYPE_ICON, SINGLE_VALUE_FIELD_KEY, type SingleValueVitalType } from "@/components/health/vital-type-config";
import { ReferenceInfo } from "@/components/health/reference-info";

// Compact "latest reading" card (Spec Section 3) for the four generic
// single-value vital types — one component instead of four near-
// identical ones. The trend arrow is deliberately neutral-colored (not
// green/red) for these: unlike Weight's established up/down convention,
// "higher" isn't consistently good or bad for heart rate/temperature/
// SpO2/respiratory rate, and color-coding it would risk reading as an
// unintended medical judgment (the same reason Blood Pressure never
// diagnoses — see lib/health/blood-pressure.ts).
export async function VitalLatestCard({
  vitalType,
  readings,
  locale,
  referenceStandards,
}: {
  vitalType: SingleValueVitalType;
  readings: Vital[];
  locale: string;
  referenceStandards: ReferenceStandard[];
}) {
  const t = await getTranslations("vitals");
  const tType = await getTranslations(`vitals.types.${vitalType}`);
  const Icon = VITAL_TYPE_ICON[vitalType];
  const fieldKey = SINGLE_VALUE_FIELD_KEY[vitalType];

  const [latest, previous] = readings;
  const latestValue = latest ? (fieldKey === "pulse" ? latest.pulse : latest.value) : null;
  const previousValue = previous ? (fieldKey === "pulse" ? previous.pulse : previous.value) : null;
  const delta = latestValue !== null && previousValue !== null ? latestValue - previousValue : null;

  // Temperature has one catalog row per supported unit (°C/°F) — only
  // the one matching this reading's own unit applies (Universal
  // Reference System spec, Section 5: never guess across contexts).
  const applicableStandards = latest ? referenceStandards.filter((s) => s.unit === null || s.unit === latest.unit) : referenceStandards;

  return (
    <InfoCard icon={Icon} label={tType("label")} action={{ label: t("history.viewHistory"), href: "?tab=history" }}>
      {latest && latestValue !== null ? (
        <>
          <p className="text-2xl font-semibold text-secondary">
            {latestValue} <span className="text-sm font-normal text-muted">{latest.unit}</span>
          </p>
          {delta !== null && delta !== 0 && <TrendIndicator delta={delta} unit={latest.unit} caption={t("sinceLastMeasurement")} />}
          <p className="mt-1 text-xs text-muted">
            {new Date(latest.recorded_at).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
          </p>
          <div className="mt-2">
            <ReferenceInfo standards={applicableStandards} />
          </div>
        </>
      ) : (
        <p className="text-sm text-muted">{tType("noReadings")}</p>
      )}
    </InfoCard>
  );
}
