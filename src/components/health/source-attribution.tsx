"use client";

import { useTranslations } from "next-intl";
import type { ReferenceStandard } from "@/types/health/entities";

// The one reusable "who says so" line (Universal Reference System spec,
// Section 23: <SourceAttribution/>) — used inside ReferenceInfo,
// ClinicalThreshold, and the detail modal rather than re-typing
// "Source: X · [View Source]" in every place a reference gets shown.
export function SourceAttribution({ standard, compact = false }: { standard: ReferenceStandard; compact?: boolean }) {
  const t = useTranslations("reference");

  return (
    <p className="text-xs text-muted">
      {t("source")}: {standard.source_name}
      {!compact && (
        <>
          {" · "}
          <a href={standard.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            {t("viewSource")}
          </a>
        </>
      )}
    </p>
  );
}
