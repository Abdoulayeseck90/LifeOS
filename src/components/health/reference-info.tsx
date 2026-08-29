"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import type { ReferenceStandard } from "@/types/health/entities";
import { resolveGenericReference, referenceStandardRangeText } from "@/lib/health/reference-standards";
import { ReferenceDetailModal } from "@/components/health/reference-detail-modal";

// Universal Reference System spec, Section 1: "must NOT blindly call
// everything a normal range" — the label shown depends on the standard's
// own reference_kind, never a hard-coded "Normal range" string.
const KIND_LABEL_KEY: Record<string, string> = {
  reference_range: "referenceRange",
  reference_value: "referenceValue",
  expected_range: "expectedRange",
  clinical_target: "clinicalTarget",
};

// The reusable display for single-value vitals (Heart Rate, Respiratory
// Rate, Temperature, SpO2 — Sections 4-7): shows the reference alongside
// the value, source-attributed, with a click-for-details info icon
// (Section 15). Deliberately no computed Low/Normal/High pill here —
// only Blood Pressure and BMI resolve to an actual category
// (ClinicalThreshold, a sibling component), matching the spec's own
// examples for these vitals.
export function ReferenceInfo({ standards }: { standards: ReferenceStandard[] }) {
  const t = useTranslations("reference");
  const [detailOpen, setDetailOpen] = useState(false);
  const display = resolveGenericReference(standards);

  if (display.kind === "unavailable") {
    return <p className="text-xs text-muted">{t("notAvailable")}</p>;
  }

  const { standard } = display;
  const kindLabel = t(KIND_LABEL_KEY[standard.reference_kind] ?? "referenceRange");
  const rangeText = referenceStandardRangeText(standard);

  return (
    <div>
      <div className="flex items-center gap-1">
        <p className="text-xs text-muted">
          {kindLabel}: {rangeText}
          {standard.unit ? ` ${standard.unit}` : ""}
        </p>
        <button
          type="button"
          onClick={() => setDetailOpen(true)}
          aria-label={t("viewDetailsFor", { kind: kindLabel })}
          className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted hover:text-primary"
        >
          <Info size={12} />
        </button>
      </div>
      {standard.applicable_population && <p className="text-[11px] text-muted">{standard.applicable_population}</p>}

      <ReferenceDetailModal open={detailOpen} onOpenChange={setDetailOpen} standard={standard} title={kindLabel} />
    </div>
  );
}
