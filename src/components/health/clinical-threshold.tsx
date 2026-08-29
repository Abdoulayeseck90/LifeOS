"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import type { ReferenceStandard } from "@/types/health/entities";
import { ReferenceDetailModal } from "@/components/health/reference-detail-modal";

// Universal Reference System spec, Section 23: <ClinicalThreshold/> —
// for measurements that resolve to a named GUIDELINE CATEGORY rather
// than a plain range (Blood Pressure's AHA stages, BMI's CDC
// categories). `standard` is whichever bracket row actually matched
// (used for the click-for-details modal — Section 15); when the
// resolver couldn't classify the reading at all (no matching bracket),
// the caller simply doesn't render this component.
export function ClinicalThreshold({
  category,
  guidelineLabel,
  standard,
}: {
  category: string;
  guidelineLabel: string;
  standard: ReferenceStandard;
}) {
  const t = useTranslations("reference");
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center gap-1">
        <p className="text-sm font-medium text-secondary">{category}</p>
        <button
          type="button"
          onClick={() => setDetailOpen(true)}
          aria-label={t("viewDetailsFor", { kind: category })}
          className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted hover:text-primary"
        >
          <Info size={12} />
        </button>
      </div>
      <p className="text-xs text-muted">
        {t("guidelineThreshold")} · {guidelineLabel}
      </p>

      <ReferenceDetailModal open={detailOpen} onOpenChange={setDetailOpen} standard={standard} title={t("guidelineThreshold")} />
    </div>
  );
}
