"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Vital } from "@/types/health/entities";
import type { DateRange } from "@/lib/dates/range";
import { SINGLE_VALUE_FIELD_KEY, type SingleValueVitalType } from "@/components/health/vital-type-config";
import { BloodPressureForm } from "@/components/health/blood-pressure-form";
import { VitalSingleValueForm } from "@/components/health/vital-single-value-form";
import { RecordFormModal } from "@/components/core/record-form-modal";
import { ConfirmDialog } from "@/components/core/confirm-dialog";

// Generic search/filter/sort history list for every `vitals`-table
// vital type (blood_pressure + the 4 single-value types) — one
// component instead of a near-duplicate per type, following the same
// "personal-scale data, client-side filtering" approach as
// lab-results-filters.tsx. Weight/Height/BMI keep their own existing
// body_metrics list (BodyMetricCard) — this doesn't touch that.
export function VitalHistory({
  vitalType,
  readings,
  dateRange,
}: {
  vitalType: "blood_pressure" | SingleValueVitalType;
  readings: Vital[];
  // Driven by the shared page-level DateRangeFilter (Date Range Filter
  // spec) rather than this component's own date input — one control for
  // the whole Vitals page's history sections, not a separate picker per
  // vital type.
  dateRange: DateRange;
}) {
  const t = useTranslations("vitals");
  const tType = useTranslations(`vitals.types.${vitalType}`);
  const tHistory = useTranslations("vitals.history");
  const tCommon = useTranslations("common");
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const isBloodPressure = vitalType === "blood_pressure";
  const fieldKey = isBloodPressure ? null : SINGLE_VALUE_FIELD_KEY[vitalType];

  async function handleDelete(id: string) {
    const response = await fetch(`/api/health/vitals/${id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = readings.filter((reading) => {
      if (q && !(reading.notes ?? "").toLowerCase().includes(q)) return false;
      const day = reading.recorded_at.slice(0, 10);
      if (dateRange.from && day < dateRange.from) return false;
      if (dateRange.to && day > dateRange.to) return false;
      return true;
    });
    result.sort((a, b) =>
      sort === "newest" ? b.recorded_at.localeCompare(a.recorded_at) : a.recorded_at.localeCompare(b.recorded_at)
    );
    return result;
  }, [readings, query, dateRange.from, dateRange.to, sort]);

  return (
    <div id={`vital-history-${vitalType}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          {tType("label")} {tHistory("title")}
        </h2>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tHistory("searchPlaceholder")}
          aria-label={tHistory("searchPlaceholder")}
          className="w-full rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm text-secondary sm:max-w-xs"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
          className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm text-secondary"
        >
          <option value="newest">{tHistory("sortNewest")}</option>
          <option value="oldest">{tHistory("sortOldest")}</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-dashed border-surface p-8 text-center">
          <p className="text-sm text-muted">{readings.length === 0 ? tType("noReadings") : tHistory("noResults")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((reading) => (
            <div
              key={reading.id}
              className="flex flex-col gap-2 rounded-card border border-surface bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                {isBloodPressure ? (
                  <p className="font-medium text-secondary">
                    {reading.systolic} / {reading.diastolic} {t("types.blood_pressure.unit")}
                    <span className="ml-2 text-sm font-normal text-muted">
                      {tHistory("pulse")}: {reading.pulse} {t("types.heart_rate.unit")}
                    </span>
                  </p>
                ) : (
                  <p className="font-medium text-secondary">
                    {fieldKey === "pulse" ? reading.pulse : reading.value} {reading.unit}
                  </p>
                )}
                <p className="mt-1 text-sm text-muted">
                  {new Date(reading.recorded_at).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
                </p>
                {reading.notes && <p className="mt-1 text-sm text-secondary">{reading.notes}</p>}
              </div>
              <div className="flex items-center gap-4">
                <RecordFormModal
                  trigger={(open) => (
                    <button type="button" onClick={open} className="inline-flex min-h-11 items-center text-xs text-primary hover:underline">
                      {tCommon("edit")}
                    </button>
                  )}
                  modalTitle={tType("editTitle")}
                >
                  {(modalProps) =>
                    isBloodPressure ? (
                      <BloodPressureForm reading={reading} {...modalProps} />
                    ) : (
                      <VitalSingleValueForm vitalType={vitalType} reading={reading} {...modalProps} />
                    )
                  }
                </RecordFormModal>
                <ConfirmDialog
                  trigger={(open) => (
                    <button
                      type="button"
                      onClick={open}
                      className="inline-flex min-h-11 items-center text-xs text-status-urgent hover:underline"
                    >
                      {tCommon("delete")}
                    </button>
                  )}
                  title={tHistory("deleteConfirmTitle")}
                  description={tHistory("deleteConfirmMessage")}
                  onConfirm={() => handleDelete(reading.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
