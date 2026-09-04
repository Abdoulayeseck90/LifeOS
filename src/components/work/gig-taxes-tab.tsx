"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { TaxYearSummary } from "@/lib/work/gig-calculations";
import type { GigTaxSettings, GigVehicle } from "@/types/work/entities";
import { FormField } from "@/components/core/form/form-field";
import { LifeOSInput } from "@/components/core/form/lifeos-input";
import { LifeOSSelect } from "@/components/core/form/lifeos-select";
import { formatCurrency, formatMiles } from "@/lib/work/gig-format";
import { GigTaxExportPanel } from "@/components/work/gig-tax-export-panel";

// Spec Section 9: tax-year mileage rate is user-configured, never a
// hardcoded IRS figure, and every number here is clearly an estimate
// derived from the user's own recorded shifts — never presented as
// filed/definitive tax guidance.
export function GigTaxesTab({
  years,
  summaries,
  taxSettingsByYear,
  vehicles,
}: {
  years: number[];
  summaries: Record<number, TaxYearSummary>;
  taxSettingsByYear: Record<number, GigTaxSettings>;
  vehicles: GigVehicle[];
}) {
  const t = useTranslations("gigDriving.taxes");
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState<number>(years[0] ?? new Date().getFullYear());
  const [rate, setRate] = useState(taxSettingsByYear[selectedYear]?.standard_mileage_rate?.toString() ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summary = summaries[selectedYear];

  function handleYearChange(year: number) {
    setSelectedYear(year);
    setRate(taxSettingsByYear[year]?.standard_mileage_rate?.toString() ?? "");
  }

  async function handleSaveRate(event: FormEvent) {
    event.preventDefault();
    if (!rate || Number(rate) <= 0) {
      setError(t("rateRequired"));
      return;
    }
    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/work/gig-driving/tax-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tax_year: selectedYear, standard_mileage_rate: Number(rate) }),
    });

    setSubmitting(false);
    if (!response.ok) {
      setError(t("saveError"));
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <FormField label={t("taxYear")} htmlFor="tax-year-select" className="max-w-xs">
        <LifeOSSelect id="tax-year-select" value={selectedYear} onChange={(e) => handleYearChange(Number(e.target.value))}>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </LifeOSSelect>
      </FormField>

      <form onSubmit={handleSaveRate} className="flex flex-col gap-3 rounded-card border border-surface bg-white p-4 sm:max-w-sm">
        <h2 className="text-sm font-semibold text-secondary">{t("mileageRateTitle")}</h2>
        {error && <p className="text-sm text-status-urgent">{error}</p>}
        <FormField label={t("mileageRate")} htmlFor="tax-mileage-rate" helperText={t("mileageRateHelper")}>
          <LifeOSInput id="tax-mileage-rate" type="number" min={0} step="0.001" value={rate} onChange={(e) => setRate(e.target.value)} />
        </FormField>
        <button
          type="submit"
          disabled={submitting}
          className="min-h-11 w-fit rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting ? t("saving") : t("saveRateButton")}
        </button>
      </form>

      {summary && (
        <div className="rounded-card border border-surface bg-white p-4">
          <p className="mb-3 text-xs font-medium text-muted">{t("estimateDisclaimer")}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted">{t("totalIncome")}</p>
              <p className="text-lg font-semibold text-secondary">{formatCurrency(summary.totalIncome)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">{t("businessMiles")}</p>
              <p className="text-lg font-semibold text-secondary">{formatMiles(summary.businessMiles)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">{t("recordedExpenses")}</p>
              <p className="text-lg font-semibold text-secondary">{formatCurrency(summary.recordedExpenses)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">{t("mileageDeduction")}</p>
              <p className="text-lg font-semibold text-secondary">
                {summary.estimatedMileageDeduction !== null ? formatCurrency(summary.estimatedMileageDeduction) : t("noRateSet")}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">{t("estimatedNetProfit")}</p>
              <p className="text-lg font-semibold text-secondary">{formatCurrency(summary.estimatedNetProfit)}</p>
            </div>
          </div>
        </div>
      )}

      <GigTaxExportPanel vehicles={vehicles} taxYear={selectedYear} />
    </div>
  );
}
