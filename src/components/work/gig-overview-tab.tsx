import { getTranslations } from "next-intl/server";
import type { GigVehicle, GigShift } from "@/types/work/entities";
import type { GigMetrics } from "@/lib/work/gig-calculations";
import { formatCurrency, formatMiles, formatHours } from "@/lib/work/gig-format";
import { GigQuickShiftPanel } from "@/components/work/gig-quick-shift-panel";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-surface bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold text-secondary">{value}</p>
    </div>
  );
}

export async function GigOverviewTab({
  vehicles,
  inProgressShift,
  weekMetrics,
  nextShiftLabel,
}: {
  vehicles: GigVehicle[];
  inProgressShift: GigShift | null;
  weekMetrics: GigMetrics;
  nextShiftLabel: string | null;
}) {
  const t = await getTranslations("gigDriving.overview");

  return (
    <div className="flex flex-col gap-6">
      <GigQuickShiftPanel vehicles={vehicles} inProgressShift={inProgressShift} />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-secondary">{t("thisWeek")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label={t("gross")} value={formatCurrency(weekMetrics.grossEarnings)} />
          <StatCard label={t("net")} value={formatCurrency(weekMetrics.estimatedNet)} />
          <StatCard label={t("miles")} value={formatMiles(weekMetrics.miles)} />
          <StatCard label={t("hours")} value={formatHours(weekMetrics.hours)} />
        </div>
      </div>

      {nextShiftLabel && (
        <div className="rounded-card border border-surface bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("nextShift")}</p>
          <p className="mt-1 text-sm text-secondary">{nextShiftLabel}</p>
        </div>
      )}
    </div>
  );
}
