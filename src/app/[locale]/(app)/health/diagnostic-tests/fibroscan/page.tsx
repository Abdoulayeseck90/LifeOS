import { getTranslations } from "next-intl/server";
import { listDiagnosticTests } from "@/services/health/diagnostic-tests";
import { Link } from "@/lib/i18n/navigation";

// Read-only comparison view — Addendum Section 3: "Allow historical
// FibroScan results to be displayed and compared over time." Entries are
// created via the shared form on the main Diagnostic Tests page; this
// view just filters test_type='fibroscan' and surfaces the structured
// measurements side by side. Per-user data behind auth — never
// statically prerendered.
export const dynamic = "force-dynamic";

function measurementNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

export default async function FibroscanHistoryPage() {
  const t = await getTranslations("diagnosticTests.fibroscan");
  const scans = await listDiagnosticTests("fibroscan");

  return (
    <div>
      <Link href="/health/diagnostic-tests" className="mb-4 inline-block text-sm text-primary hover:underline">
        ← {t("backToDiagnosticTests")}
      </Link>
      <h1 className="mb-6 text-3xl font-semibold text-secondary">{t("title")}</h1>

      {scans.length === 0 ? (
        <p className="text-sm text-muted">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-surface bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-surface text-xs text-muted">
                <th className="px-4 py-2">{t("date")}</th>
                <th className="px-4 py-2">{t("liverStiffness")}</th>
                <th className="px-4 py-2">{t("cap")}</th>
                <th className="px-4 py-2">{t("iqrMedianPercent")}</th>
                <th className="px-4 py-2">{t("successRate")}</th>
                <th className="px-4 py-2">{t("fastingStatus")}</th>
                <th className="px-4 py-2">{t("interpretation")}</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((scan) => {
                const kpa = measurementNumber(scan.measurements.liver_stiffness_kpa);
                const cap = measurementNumber(scan.measurements.cap_dbm);
                const iqrMedian = measurementNumber(scan.measurements.iqr_median_percent);
                const successRate = measurementNumber(scan.measurements.success_rate_percent);
                const fasting = scan.measurements.fasting_status;

                return (
                  <tr key={scan.id} className="border-b border-surface last:border-0">
                    <td className="px-4 py-2 text-secondary">{scan.study_date}</td>
                    <td className="px-4 py-2 text-secondary">{kpa !== null ? `${kpa} kPa` : "—"}</td>
                    <td className="px-4 py-2 text-secondary">{cap !== null ? `${cap} dB/m` : "—"}</td>
                    <td className="px-4 py-2 text-secondary">{iqrMedian !== null ? `${iqrMedian}%` : "—"}</td>
                    <td className="px-4 py-2 text-secondary">{successRate !== null ? `${successRate}%` : "—"}</td>
                    <td className="px-4 py-2 text-secondary">
                      {typeof fasting === "boolean" ? (fasting ? t("yes") : t("no")) : "—"}
                    </td>
                    <td className="px-4 py-2 text-secondary">{scan.impression ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
