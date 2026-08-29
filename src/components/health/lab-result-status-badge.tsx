"use client";

import { useTranslations } from "next-intl";
import type { LabResult, ReferenceStandard } from "@/types/health/entities";
import { resolveLabResultStatusWithBasis } from "@/lib/health/reference-range";
import { LAB_STATUS_BADGE_VARIANT } from "@/lib/health/lab-level";
import { Badge } from "@/components/core/badge";

// Reference Range Source System spec, Section 6: a status computed
// from a general/external range must say so — never presented as if
// it came from the user's own lab, and never framed as a diagnosis.
export function LabResultStatusBadge({
  result,
  externalRanges,
}: {
  result: Pick<LabResult, "value_numeric" | "reference_low" | "reference_high" | "result_status">;
  externalRanges: ReferenceStandard[];
}) {
  const t = useTranslations("labs");
  const { status, basis } = resolveLabResultStatusWithBasis(result, externalRanges);

  if (!status) return null;

  return (
    <div className="flex flex-col items-end gap-0.5">
      <Badge variant={LAB_STATUS_BADGE_VARIANT[status]}>{t(`levels.${status}`)}</Badge>
      {basis === "external" && <p className="text-[11px] text-muted">{t("statusBasedOnGeneralRange")}</p>}
    </div>
  );
}
