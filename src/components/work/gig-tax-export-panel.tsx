"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import type { GigVehicle, GigPlatform } from "@/types/work/entities";
import type { GigTaxExportData } from "@/lib/work/gig-tax-export";
import { LifeOSSelect } from "@/components/core/form/lifeos-select";
import { LifeOSCheckbox } from "@/components/core/form/lifeos-checkbox";
import { GigTaxReviewModal } from "@/components/work/gig-tax-review-modal";
import { formatCurrency, formatMiles } from "@/lib/work/gig-format";

const PLATFORMS: GigPlatform[] = ["doordash", "ubereats", "spark", "other"];

interface SnapshotSummary {
  id: string;
  generated_at: string;
  total_income: number;
  total_mileage: number;
  total_expenses: number;
}

type ExportAction = "csv" | "xlsx" | "pdf" | "package";

// Tax Filing Export UI: Vehicle/Platform filters -> Review Tax Year ->
// CSV/Excel/PDF/full package downloads. All four export buttons work
// independently of Review (the spec lists them as siblings), and every
// download goes through the standard fetch -> blob -> <a download>
// pattern already used in document-card.tsx's handleDownload.
export function GigTaxExportPanel({ vehicles, taxYear }: { vehicles: GigVehicle[]; taxYear: number }) {
  const t = useTranslations("gigDriving.taxExport");
  const locale = useLocale();
  const [vehicleId, setVehicleId] = useState("");
  const [platforms, setPlatforms] = useState<GigPlatform[]>([]);
  const [reviewData, setReviewData] = useState<GigTaxExportData | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState<null | "review" | ExportAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);

  function refreshSnapshots() {
    fetch(`/api/work/gig-driving/tax-export/snapshots?tax_year=${taxYear}`)
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((body) => setSnapshots(body.data ?? []))
      .catch(() => setSnapshots([]));
  }

  useEffect(() => {
    refreshSnapshots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taxYear]);

  function filterPayload() {
    return { tax_year: taxYear, vehicle_id: vehicleId || undefined, platforms: platforms.length > 0 ? platforms : undefined };
  }

  async function handleReview() {
    setLoadingAction("review");
    setError(null);
    const response = await fetch("/api/work/gig-driving/tax-export/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filterPayload()),
    });
    setLoadingAction(null);
    if (!response.ok) {
      setError(t("reviewError"));
      return;
    }
    const body = await response.json();
    setReviewData(body.data);
    setReviewOpen(true);
  }

  async function handleDownload(action: ExportAction) {
    setLoadingAction(action);
    setError(null);
    const response = await fetch(`/api/work/gig-driving/tax-export/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filterPayload()),
    });
    setLoadingAction(null);
    if (!response.ok) {
      setError(t("exportError"));
      return;
    }
    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") ?? "";
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match?.[1] ?? `${taxYear}-Gig-Tax-Export`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    if (action === "package") refreshSnapshots();
  }

  return (
    <div className="flex flex-col gap-4 rounded-card border border-surface bg-white p-4">
      <h2 className="text-sm font-semibold text-secondary">{t("title")}</h2>
      {error && <p className="text-sm text-status-urgent">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {vehicles.length > 0 && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-secondary">{t("vehicleFilter")}</label>
            <LifeOSSelect value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              <option value="">{t("allVehicles")}</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nickname ?? ([v.year, v.make, v.model].filter(Boolean).join(" ") || v.id)}
                </option>
              ))}
            </LifeOSSelect>
          </div>
        )}
        <div>
          <p className="mb-1.5 text-sm font-medium text-secondary">{t("platformFilter")}</p>
          <div className="flex flex-wrap gap-3">
            {PLATFORMS.map((p) => (
              <LifeOSCheckbox
                key={p}
                label={t(`platformOptions.${p}`)}
                checked={platforms.includes(p)}
                onChange={(e) => setPlatforms(e.target.checked ? [...platforms, p] : platforms.filter((x) => x !== p))}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleReview}
          disabled={loadingAction !== null}
          className="min-h-11 rounded border border-slate-300 px-4 text-sm font-medium text-secondary hover:bg-surface disabled:opacity-50"
        >
          {loadingAction === "review" ? t("loading") : t("reviewButton")}
        </button>
        <button
          type="button"
          onClick={() => handleDownload("csv")}
          disabled={loadingAction !== null}
          className="min-h-11 rounded border border-slate-300 px-4 text-sm font-medium text-secondary hover:bg-surface disabled:opacity-50"
        >
          {loadingAction === "csv" ? t("loading") : t("exportCsvButton")}
        </button>
        <button
          type="button"
          onClick={() => handleDownload("xlsx")}
          disabled={loadingAction !== null}
          className="min-h-11 rounded border border-slate-300 px-4 text-sm font-medium text-secondary hover:bg-surface disabled:opacity-50"
        >
          {loadingAction === "xlsx" ? t("loading") : t("exportExcelButton")}
        </button>
        <button
          type="button"
          onClick={() => handleDownload("pdf")}
          disabled={loadingAction !== null}
          className="min-h-11 rounded border border-slate-300 px-4 text-sm font-medium text-secondary hover:bg-surface disabled:opacity-50"
        >
          {loadingAction === "pdf" ? t("loading") : t("exportPdfButton")}
        </button>
        <button
          type="button"
          onClick={() => handleDownload("package")}
          disabled={loadingAction !== null}
          className="min-h-11 rounded bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loadingAction === "package" ? t("loading") : t("downloadPackageButton")}
        </button>
      </div>

      {snapshots.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("pastExports")}</h3>
          <ul className="flex flex-col gap-1">
            {snapshots.map((s) => (
              <li key={s.id} className="flex justify-between border-b border-surface py-1.5 text-xs text-secondary">
                <span>{new Date(s.generated_at).toLocaleString(locale)}</span>
                <span>
                  {formatCurrency(s.total_income)} · {formatMiles(s.total_mileage)} · {formatCurrency(s.total_expenses)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <GigTaxReviewModal data={reviewData} open={reviewOpen} onOpenChange={setReviewOpen} />
    </div>
  );
}
