"use client";

import { useTranslations } from "next-intl";
import { Modal } from "@/components/core/modal";
import type { GigTaxExportData } from "@/lib/work/gig-tax-export";
import { formatCurrency, formatMiles } from "@/lib/work/gig-format";

// "Review Tax Year" -- the full itemized breakdown the spec requires be
// available before generating a final export. Read-only: every figure
// here is exactly what the CSV/Excel/PDF/ZIP exports would also contain,
// generated from the same computeGigTaxExport() payload.
export function GigTaxReviewModal({ data, open, onOpenChange }: { data: GigTaxExportData | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("gigDriving.taxExport");

  if (!data) return null;

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t("reviewTitle", { year: data.taxYear })}>
      <div className="flex max-h-[70vh] flex-col gap-6 overflow-y-auto pr-1">
        <section>
          <h3 className="mb-2 text-sm font-semibold text-secondary">{t("sectionIncome")}</h3>
          <table className="w-full text-left text-sm">
            <tbody>
              {Object.entries(data.income.byPlatform).map(([platform, total]) => (
                <tr key={platform} className="border-b border-surface">
                  <td className="py-1.5">{platform}</td>
                  <td className="py-1.5 text-right">{formatCurrency(total)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-1.5">{t("total")}</td>
                <td className="py-1.5 text-right">{formatCurrency(data.income.total)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-secondary">{t("sectionMileage")}</h3>
          <p className="text-sm text-secondary">
            {t("totalBusinessMiles")}: <span className="font-semibold">{formatMiles(data.mileage.totalMiles)}</span>
          </p>
          {data.mileage.byVehicle.length > 0 && (
            <table className="mt-2 w-full text-left text-sm">
              <tbody>
                {data.mileage.byVehicle.map((v) => (
                  <tr key={v.vehicleId ?? "unassigned"} className="border-b border-surface">
                    <td className="py-1.5">{v.vehicleName}</td>
                    <td className="py-1.5 text-right">{formatMiles(v.miles)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-secondary">{t("sectionExpenses")}</h3>
          {data.expenses.records.length === 0 ? (
            <p className="text-sm text-muted">{t("noExpenses")}</p>
          ) : (
            <table className="w-full text-left text-sm">
              <tbody>
                {data.expenses.records.map((e) => (
                  <tr key={e.id} className="border-b border-surface">
                    <td className="py-1.5">
                      {e.date} — {e.category}
                      {e.description ? ` (${e.description})` : ""}
                    </td>
                    <td className="py-1.5 text-right">
                      {formatCurrency(e.amount)}
                      {e.hasReceipt ? ` · ${t("hasReceipt")}` : ""}
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-1.5">{t("total")}</td>
                  <td className="py-1.5 text-right">{formatCurrency(data.expenses.total)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </section>

        {data.maintenanceLog.length > 0 && (
          <section>
            <h3 className="mb-1 text-sm font-semibold text-secondary">{t("sectionMaintenance")}</h3>
            <p className="mb-2 text-xs text-muted">{t("maintenanceDisclaimer")}</p>
            <table className="w-full text-left text-sm">
              <tbody>
                {data.maintenanceLog.map((m) => (
                  <tr key={m.id} className="border-b border-surface">
                    <td className="py-1.5">
                      {m.date} — {m.vehicleName} — {m.type}
                    </td>
                    <td className="py-1.5 text-right">{m.cost !== null ? formatCurrency(m.cost) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {data.receiptIndex.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-semibold text-secondary">{t("sectionReceipts")}</h3>
            <ul className="flex flex-col gap-1 text-sm text-secondary">
              {data.receiptIndex.map((r) => (
                <li key={r.documentId}>
                  {r.documentName} — {r.category} {r.amount !== null ? `(${formatCurrency(r.amount)})` : ""}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-card border border-surface bg-surface/40 p-3">
          <p className="mb-2 text-xs font-medium text-muted">{t("estimateDisclaimer")}</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <p>
              {t("estimatedMileageDeduction")}:{" "}
              <span className="font-semibold">
                {data.summary.estimatedMileageDeduction !== null ? formatCurrency(data.summary.estimatedMileageDeduction) : t("noRateSet")}
              </span>
            </p>
            <p>
              {t("estimatedNetProfit")}: <span className="font-semibold">{formatCurrency(data.summary.estimatedNetProfit)}</span>
            </p>
          </div>
        </section>
      </div>
    </Modal>
  );
}
