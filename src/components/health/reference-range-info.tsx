"use client";

import { useTranslations } from "next-intl";
import type { LabResult, ReferenceStandard } from "@/types/health/entities";
import { resolveReferenceRangeDisplay } from "@/lib/health/reference-range";

// Renders whichever tier the 3-tier priority resolved to (Reference
// Range Source System spec, Sections 1-3/9): a laboratory range never
// gets relabeled as "general," and a general/external range is never
// allowed to look like it came from the user's own lab — the two are
// visually and textually distinct everywhere this renders (main list
// card, history table row, test history page).
function rangeText(low: number | null, high: number | null): string {
  if (low !== null && high !== null) return `${low}–${high}`;
  if (low !== null) return `≥ ${low}`;
  if (high !== null) return `≤ ${high}`;
  return "";
}

export function ReferenceRangeInfo({
  result,
  externalRanges,
  compact = false,
}: {
  result: Pick<LabResult, "reference_low" | "reference_high" | "reference_text">;
  externalRanges: ReferenceStandard[];
  compact?: boolean;
}) {
  const t = useTranslations("labs");
  const display = resolveReferenceRangeDisplay(result, externalRanges);

  if (display.kind === "laboratory") {
    const text = display.text ?? rangeText(display.low, display.high);
    return (
      <div>
        <p className="text-sm text-muted">
          {t("referenceRange")}: {text || t("notAvailable")}
        </p>
        {!compact && <p className="text-xs text-muted">{t("laboratoryReport")}</p>}
      </div>
    );
  }

  if (display.kind === "external-single") {
    const r = display.range;
    return (
      <div>
        <p className="text-sm text-muted">
          {t("generalReferenceRange")}: {rangeText(r.reference_low, r.reference_high)}
          {r.unit ? ` ${r.unit}` : ""}
        </p>
        <p className="text-xs text-muted">
          {t("source")}: {r.source_name}
          {!compact && (
            <>
              {" · "}
              <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                {t("viewSource")}
              </a>
            </>
          )}
        </p>
      </div>
    );
  }

  if (display.kind === "external-multiple") {
    return (
      <div>
        <p className="text-sm text-muted">{t("generalReferenceRange")}:</p>
        <ul className="mt-0.5 flex flex-col gap-0.5">
          {display.ranges.map((r) => (
            <li key={r.id} className="text-xs text-muted">
              {r.applicable_population ? `${r.applicable_population}: ` : ""}
              {rangeText(r.reference_low, r.reference_high)}
              {r.unit ? ` ${r.unit}` : ""} — {r.source_name}
              {!compact && (
                <>
                  {" "}
                  <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {t("viewSource")}
                  </a>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <p className="text-sm text-muted">
      {t("referenceRange")}: {t("notAvailable")}
    </p>
  );
}
