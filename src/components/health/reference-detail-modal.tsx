"use client";

import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import type { ReferenceStandard } from "@/types/health/entities";
import { referenceStandardRangeText } from "@/lib/health/reference-standards";
import { Modal } from "@/components/core/modal";

// Universal Reference System spec, Section 15: "Click for details" —
// one reusable detail view (range/category, source, population,
// retrieved date, View Source) for any reference_standards row,
// whether it's showing as a plain reference, an expected range, or a
// clinical-guideline category.
export function ReferenceDetailModal({
  open,
  onOpenChange,
  standard,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  standard: ReferenceStandard;
  title: string;
}) {
  const t = useTranslations("reference");
  const { locale } = useParams<{ locale: string }>();
  const rangeText = referenceStandardRangeText(standard);

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title}>
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs text-muted">{standard.reference_category ? t("category") : t("range")}</p>
          <p className="text-secondary">
            {standard.reference_category ?? `${rangeText}${standard.unit ? ` ${standard.unit}` : ""}`}
          </p>
          {standard.reference_category && rangeText && (
            <p className="mt-1 text-xs text-muted">
              {rangeText}
              {standard.unit ? ` ${standard.unit}` : ""}
            </p>
          )}
        </div>

        <div>
          <p className="text-xs text-muted">{t("source")}</p>
          <p className="text-secondary">{standard.source_name}</p>
        </div>

        {standard.applicable_population && (
          <div>
            <p className="text-xs text-muted">{t("population")}</p>
            <p className="text-secondary">{standard.applicable_population}</p>
          </div>
        )}

        {standard.guideline_version && (
          <div>
            <p className="text-xs text-muted">{t("guidelineVersion")}</p>
            <p className="text-secondary">{standard.guideline_version}</p>
          </div>
        )}

        <div>
          <p className="text-xs text-muted">{t("retrieved")}</p>
          <p className="text-secondary">{new Date(standard.retrieved_at).toLocaleDateString(locale, { dateStyle: "long" })}</p>
        </div>

        <a
          href={standard.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 w-fit items-center text-sm font-medium text-primary hover:underline"
        >
          {t("viewSource")}
        </a>
      </div>
    </Modal>
  );
}
