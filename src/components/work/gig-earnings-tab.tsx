import { getTranslations } from "next-intl/server";
import type { GigMetrics } from "@/lib/work/gig-calculations";
import { formatCurrency, formatPerUnit } from "@/lib/work/gig-format";

export async function GigEarningsTab({ overall, byPlatform }: { overall: GigMetrics; byPlatform: Record<string, GigMetrics> }) {
  const t = await getTranslations("gigDriving.earnings");
  const platforms = Object.keys(byPlatform);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-card border border-surface bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("allPlatforms")}</p>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted">{t("gross")}</p>
            <p className="text-lg font-semibold text-secondary">{formatCurrency(overall.grossEarnings)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">{t("net")}</p>
            <p className="text-lg font-semibold text-secondary">{formatCurrency(overall.estimatedNet)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">{t("grossPerHour")}</p>
            <p className="text-lg font-semibold text-secondary">{formatPerUnit(overall.grossPerHour, t("hourAbbr"))}</p>
          </div>
          <div>
            <p className="text-xs text-muted">{t("grossPerMile")}</p>
            <p className="text-lg font-semibold text-secondary">{formatPerUnit(overall.grossPerMile, t("mileAbbr"))}</p>
          </div>
        </div>
      </div>

      {platforms.length === 0 ? (
        <p className="text-sm text-muted">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-surface text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-4">{t("platform")}</th>
                <th className="py-2 pr-4">{t("gross")}</th>
                <th className="py-2 pr-4">{t("net")}</th>
                <th className="py-2 pr-4">{t("grossPerHour")}</th>
                <th className="py-2 pr-4">{t("grossPerMile")}</th>
              </tr>
            </thead>
            <tbody>
              {platforms.map((platform) => {
                const metrics = byPlatform[platform]!;
                return (
                  <tr key={platform} className="border-b border-surface last:border-0">
                    <td className="py-2 pr-4 font-medium text-secondary">{t(`platformOptions.${platform}`)}</td>
                    <td className="py-2 pr-4">{formatCurrency(metrics.grossEarnings)}</td>
                    <td className="py-2 pr-4">{formatCurrency(metrics.estimatedNet)}</td>
                    <td className="py-2 pr-4">{formatPerUnit(metrics.grossPerHour, t("hourAbbr"))}</td>
                    <td className="py-2 pr-4">{formatPerUnit(metrics.grossPerMile, t("mileAbbr"))}</td>
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
